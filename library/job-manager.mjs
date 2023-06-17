/**
 * **Created on 07/06/2023**
 *
 * library/job-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */
import ApplicationController from './application-controller.js'
import { logger } from './logger.js'
import cron from 'node-cron'
import config from 'config'
import { fork } from 'child_process'
import crypto from 'crypto'

/**
 * Represents the information related to a child job process.
 *
 * @typedef {Object} Job
 * @property {string} applicationName - The name of the application the job belongs to.
 * @property {string} appName - The name of the app the job belongs to.
 * @property {string} controllerName - The name of the controller the job belongs to.
 * @property {string} jobName - The name of the job.
 * @property {function} jobFunction - The function that performs the job.
 * @property {string} schedule - The cron schedule for the job.
 */

/**
 * Represents the information related to a child job process.
 *
 * @typedef {Object} JobProcess *
 * @property {boolean} running - Indicates whether the job is currently running.
 * @property {boolean} killing - Indicates whether the job is currently being killed
 * @property {ChildProcess} [childProcess] - Reference to the child process itself.
 */

export default class JobManager {
  /**
   * A static property containing a collection of jobs.
   * Each job is represented as an object and indexed by a unique hash.
   * The object includes information about the job such as its name, schedule,
   * associated application, controller, etc.
   *
   * @example
   * {
   *   "job_hash_1": {
   *     applicationName: 'App1',
   *     appName: 'Application1',
   *     controllerName: 'Controller1',
   *     jobName: 'Job1',
   *     jobFunction: function() {...},
   *     schedule: '* * * * *'
   *   },
   *   "job_hash_2": {...},
   *   ...
   * }
   *
   * @type {Object.<string, Job>}
   *
   * @static
   */
  static jobs = {}

  /**
   * A static property containing a collection of child process information.
   * Each child process information is represented as an object and indexed by a unique job hash.
   * The object includes the status of the child process such as if it is currently running or being killed,
   * and a reference to the child process itself.
   *
   * @example
   * {
   *   "job_hash_1": {
   *     running: true,
   *     killing: false,
   *     jobProcess: ChildProcessObject
   *   },
   *   "job_hash_2": {...},
   *   ...
   * }
   *
   * @type {Object.<string, JobProcess>}
   *
   * @static
   */
  static jobsProcess = {}

  /**
   * Initializes the Job Manager.
   * Run in master
   *
   * @param {import('./application.js').Application} application - The application context.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async run (application) {
    logger.info('[JOB MANAGER] Initializing...')

    await this.loadJobs(application)

    /**
     * @type {Promise<void>[]} promises
     * An array to hold all promises returned by the schedulingJob or runJob function. Each promise
     * represents the scheduling or immediate execution of a job. The array is used with Promise.all()
     * to execute all jobs in parallel and wait until all jobs have been scheduled or run.
     */
    const promises = []
    for (const [jobIndex, job] of Object.entries(this.jobs)) {
      const jobProcess = this.jobsProcess[jobIndex]

      if (job.schedule) {
        promises.push(this.schedulingJob(jobIndex, job, jobProcess))
      } else {
        promises.push(this.runJob(jobIndex, job, jobProcess))
      }
    }
    await Promise.all(promises)

    logger.debug('Applications Loaded!')
  }

  /**
   * This static async method initializes the Job Manager. It does this by:
   *   1. Logging the start of initialization.
   *   2. Loading all jobs from the application's controllers.
   *   3. Scheduling each job to be executed based on its predefined schedule, by creating a cron job for each.
   *   4. Logging the completion of applications' loading.
   *
   * If a job is scheduled to run and its previous instance is still running, it will attempt to safely kill the previous instance
   * before launching a new instance.
   *
   * Run in master and worker
   *
   * @param {import('./application.js').Application} application - The application context.
   *
   * @returns {Promise<void>} This method doesn't return any value but encapsulates its operations with a Promise due to the async operations involved.
   *
   * @static
   */
  static async loadJobs (application) {
    for (const controller of await ApplicationController.getControllers(application.applications)) {
      await controller.jobs()

      for (const job of controller.jobsList) {
        const uniqueJobId = crypto.createHash('sha1').update(job.applicationName + job.appName + job.controllerName + job.jobName).digest('hex')
        this.jobs[uniqueJobId] = job
        this.jobsProcess[uniqueJobId] = {
          running: false,
          killing: false,
          childProcess: undefined
        }
      }
    }
  }

  /**
   * Schedules a job to be run based on the job's predefined schedule.
   *
   * This method uses a cron scheduler to execute the job at the defined intervals.
   * Each job is identified by a unique job index and the details of the job are provided
   * in the job object. The jobsProcess object contains the state of the job process.
   *
   * Run in master
   *
   * @param {string} jobIndex - The unique index for the job to be scheduled.
   * @param {Job} job - The job object containing all the details for the job.
   * @param {JobProcess} jobProcess - Object containing information about the job's process status. It includes properties that track whether the job is currently running or is being killed.
   *
   * @type {Promise<void>} promises
   *
   * @static
   */
  static async schedulingJob (jobIndex, job, jobProcess) {
    logger.info(`[JOB MANAGER] [${job.jobName}] Scheduling...`)

    cron.schedule(job.schedule, async () => {
      await this.runJob(jobIndex, job, jobProcess)
    }, {
      scheduled: true,
      timezone: config.get('server.timezone')
    })
  }

  /**
   * Starts the execution of a specific job, identified by its index.
   * The method checks the process status, and if it's not running or if it's not connected,
   * it uses the 'forkJob' method to start a new process for the job.
   * If the process is already running and connected, it tries to terminate it using 'killJob' method.
   *
   * Run in master
   *
   * @param {string} jobIndex - The unique index of the job which will be used to start or terminate a job process.
   * @param {Job} job - Object containing information about the job. It includes properties like the job's name, schedule, etc.
   * @param {JobProcess} jobProcess - Object containing information about the job's process status. It includes properties that track whether the job is currently running or is being killed.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async runJob (jobIndex, job, jobProcess) {
    if (jobProcess.killing) {
      logger.error(`[JOB MANAGER] [${job.jobName}] [${jobProcess.childProcess.pid}] Waiting to finish...`)
      return
    }

    logger.info(`[JOB MANAGER] [${job.jobName}] Running...`)

    if (!jobProcess.childProcess || !jobProcess.childProcess.connected) {
      this.forkJob(jobIndex, job, jobProcess)
    } else {
      await this.killJob(jobIndex, job, jobProcess)
    }
  }

  /**
   * Sleep function for waiting purposes.
   * TODO: Move this function to a utility module.
   *
   * @param {number} ms - Time to wait in milliseconds.
   * @returns {Promise<void>}
   */
  static async sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * This method is responsible for attempting to kill a running job.
   * Each termination signal is followed by a time sleep period to allow the process to gracefully terminate.
   *
   * Run in master
   *
   * @param {string} jobIndex - The index of the job in jobs and jobsProcess.
   * @param {Job} job - Object containing information about the job.
   * @param {JobProcess} jobsProcess - Object containing information about the job process.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async killJob (jobIndex, job, jobsProcess) {
    logger.error(`[JOB MANAGER] [${job.jobName}] [${jobsProcess.childProcess.pid}] Process is still running! Killing...`)

    jobsProcess.killing = true

    const pidToKill = jobsProcess.childProcess.pid

    // Prepares callback to restart the process when finished.
    jobsProcess.childProcess.once('close', async () => {
      await this.sleep(0)
      jobsProcess.killing = false
      logger.info(`[JOB MANAGER] [${job.jobName}]  Finished!. Restarting job...`)

      this.forkJob(jobIndex, job, jobsProcess)
    })

    // Send SIGNIT
    logger.info(`[JOB MANAGER] [${job.jobName}] [${jobsProcess.childProcess.pid}] Send "SIGINT" to process...`)
    jobsProcess.childProcess.kill('SIGINT')

    // Wait for 5 seconds TODO: parameterize this duration.
    await this.sleep(5000)

    if (pidToKill !== jobsProcess.childProcess.pid || !jobsProcess.childProcess.connected) return

    logger.info(`[JOB MANAGER] [${job.jobName}] [${jobsProcess.childProcess.pid}] Send "SIGTERM"" to process...`)
    jobsProcess.childProcess.kill('SIGTERM')

    // Wait for 5 seconds TODO: parameterize this duration.
    await this.sleep(5000)

    if (pidToKill !== jobsProcess.childProcess.pid || !jobsProcess.childProcess.connected) return

    logger.info(`[JOB MANAGER]  [${job.jobName}] [${jobsProcess.childProcess.pid}] Send "SIGKILL"" to process...`)
    jobsProcess.childProcess.kill('SIGKILL')

    await this.sleep(5000)

    if (pidToKill !== jobsProcess.childProcess.pid || !jobsProcess.childProcess.connected) return

    logger.error(`[JOB MANAGER][JOB MANAGER] [${job.jobName}] [${jobsProcess.childProcess.pid}] Process is stuck. It cannot be killed. Restart aborted.`)
    jobsProcess.killing = false
  }

  /**
   * Starts a new child process to execute a specific job using fork().
   *
   * Run in master
   *
   * @param {string} jobIndex - Unique job identifier.
   * @param {Job} job - The details of the job.
   * @param {JobProcess} jobProcess - The process info for the job. This method sets its 'running' flag to true.
   *
   * @returns {void}
   *
   * @static
   */
  static forkJob (jobIndex, job, jobProcess) {
    const args = ['job', jobIndex]

    // TODO: Parametrizar silent
    jobProcess.childProcess = fork('./src/run.mjs', args, { silent: false })
    jobProcess.running = true

    logger.info(`[JOB MANAGER] [${job.jobName}]  Job "${job.jobName}" started:\n\tIndex:\t\t${jobIndex}\n\tPID:\t\t${jobProcess.childProcess.pid}\n\tConnected:\t${jobProcess.childProcess.connected}`)

    jobProcess.childProcess.once('close', (code) => {
      jobProcess.running = false
      logger.info(`[JOB MANAGER] [${job.jobName}] Job finished:\n\tIndex:\t\t${jobIndex}\n\tPID:\t\t${jobProcess.childProcess.pid}\n\tConnected:\t${jobProcess.childProcess.connected}\n\tCode:\t\t${code}`)
    })
  }

  /**
   * Starts the execution of a worker in a separate process.
   * The worker loads all jobs, then finds and executes a specific job
   * that matches the command-line arguments.
   *
   * Run in worker
   *
   * @param {import('./application.js').Application} application - The application context.
   *
   * @throws Will throw an error if the specific job could not be found.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async runWorker (application) {
    await this.loadJobs(application)

    const job = this.jobs[process.argv[3]]

    if (!job) {
      throw new Error(`Invalid Job: ${process.argv.slice(3).join(' ')}`)
    }

    await job.jobFunction()
  }
}
