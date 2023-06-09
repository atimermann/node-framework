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
 * @typedef {Object} JobInfo
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
 * @typedef {Object} JobProcessInfo *
 * @property {boolean} running - Indicates whether the job is currently running.
 * @property {boolean} killing - Indicates whether the job is currently being killed
 * @property {ChildProcess} jobProcess - Reference to the child process itself.
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
   * @type {Object.<string, JobInfo>}
   *
   * @static
   */
  static jobsInfo = {}

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
   * @type {Object.<string, JobProcessInfo>}
   *
   * @static
   */
  static jobsProcessInfo = {}

  /**
   * Initializes the Job Manager.
   *
   * @param {Object} application - The application context.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async run (application) {
    logger.info('[JOB MANAGER] Initializing...')

    await this.loadJobs(application)

    for (const [jobIndex, job] of Object.entries(this.jobsInfo)) {
      logger.info(`[JOB MANAGER] [${job.jobName}] Scheduling...`)
      cron.schedule(job.schedule, () => {
        const jobInfo = this.jobsInfo[jobIndex]
        const jobsProcessInfo = this.jobsProcessInfo[jobIndex]

        this.runJob(jobIndex, jobInfo, jobsProcessInfo)
      }, {
        scheduled: true,
        timezone: config.get('server.timezone')
      })
    }

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
   * @param {Object} application - The application context, it is used to fetch and load all the controllers and the jobs therein.
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
        this.jobsInfo[uniqueJobId] = job
        this.jobsProcessInfo[uniqueJobId] = {
          running: false,
          killing: false
        }
      }
    }
  }

  /**
   * Starts the execution of a specific job, identified by its index.
   * The method checks the process status, and if it's not running or if it's not connected,
   * it uses the 'forkJob' method to start a new process for the job.
   * If the process is already running and connected, it tries to terminate it using 'killJob' method.
   *
   * @param {string} jobIndex - The unique index of the job which will be used to start or terminate a job process.
   * @param {Object} jobInfo - Object containing information about the job. It includes properties like the job's name, schedule, etc.
   * @param {Object} jobsProcessInfo - Object containing information about the job's process status. It includes properties that track whether the job is currently running or is being killed.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async runJob (jobIndex, jobInfo, jobsProcessInfo) {
    if (jobsProcessInfo.killing) {
      logger.error(`[JOB MANAGER] [${jobInfo.jobName}] [${jobsProcessInfo.jobProcess.pid}] Waiting to finish...`)
      return
    }

    logger.info(`[JOB MANAGER] [${jobInfo.jobName}] Running...`)

    const jobProcess = jobsProcessInfo.jobProcess

    if (!jobProcess || !jobProcess.connected) {
      await this.forkJob(jobIndex, jobInfo, jobsProcessInfo)
    } else {
      await this.killJob(jobIndex, jobInfo, jobsProcessInfo)
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
   * It will initially send a 'SIGINT' signal to the process.
   * If the process doesn't terminate, it escalates the termination signal to 'SIGTERM'.
   * If the process still doesn't terminate, it then sends a 'SIGKILL' signal which should forcefully stop the process.
   * If even after 'SIGKILL', the process does not terminate, it logs an error indicating that the process is stuck and cannot be killed.
   * Each termination signal is followed by a time sleep period to allow the process to gracefully terminate.
   *
   * @param {string} jobIndex - The index of the job in jobsInfo and jobsProcessInfo.
   * @param {Object} jobInfo - Object containing information about the job.
   * @param {Object} jobsProcessInfo - Object containing information about the job process.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async killJob (jobIndex, jobInfo, jobsProcessInfo) {
    logger.error(`[JOB MANAGER] [${jobInfo.jobName}] [${jobsProcessInfo.jobProcess.pid}] Process is still running! Killing...`)

    jobsProcessInfo.killing = true

    const pidToKill = jobsProcessInfo.jobProcess.pid

    // Prepares callback to restart the process when finished.
    jobsProcessInfo.jobProcess.once('close', async (code) => {
      await this.sleep(0)
      jobsProcessInfo.killing = false
      logger.info(`[JOB MANAGER] [${jobInfo.jobName}]  Finished!. Restarting job...`)

      await this.forkJob(jobIndex, jobInfo, jobsProcessInfo)
    })

    // Send SIGNIT
    logger.info(`[JOB MANAGER] [${jobInfo.jobName}] [${jobsProcessInfo.jobProcess.pid}] Send "SIGINT" to process...`)
    jobsProcessInfo.jobProcess.kill('SIGINT')

    // Wait for 5 seconds TODO: parameterize this duration.
    await this.sleep(5000)

    if (pidToKill !== jobsProcessInfo.jobProcess.pid || !jobsProcessInfo.jobProcess.connected) return

    logger.info(`[JOB MANAGER] [${jobInfo.jobName}] [${jobsProcessInfo.jobProcess.pid}] Send "SIGTERM"" to process...`)
    jobsProcessInfo.jobProcess.kill('SIGTERM')

    // Wait for 5 seconds TODO: parameterize this duration.
    await this.sleep(5000)

    if (pidToKill !== jobsProcessInfo.jobProcess.pid || !jobsProcessInfo.jobProcess.connected) return

    logger.info(`[JOB MANAGER]  [${jobInfo.jobName}] [${jobsProcessInfo.jobProcess.pid}] Send "SIGKILL"" to process...`)
    jobsProcessInfo.jobProcess.kill('SIGKILL')

    await this.sleep(5000)

    if (pidToKill !== jobsProcessInfo.jobProcess.pid || !jobsProcessInfo.jobProcess.connected) return

    logger.error(`[JOB MANAGER][JOB MANAGER] [${jobInfo.jobName}] [${jobsProcessInfo.jobProcess.pid}] Process is stuck. It cannot be killed. Restart aborted.`)
    jobsProcessInfo.killing = false
  }

  /**
   * Starts a new process to execute a specific job.
   * It does so by forking the current process, passing a path to a module
   * and command-line arguments which define the specific job to execute.
   *
   * @param {string} jobIndex - The job index.
   *
   * @param jobInfo
   * @param jobsProcessInfo
   * @returns {Promise<void>}
   *
   * @static
   */
  static async forkJob (jobIndex, jobInfo, jobsProcessInfo) {
    const args = ['job', jobIndex]

    jobsProcessInfo.jobProcess = fork('./src/run.mjs', args, { silent: true })
    jobsProcessInfo.running = true

    logger.info(`[JOB MANAGER] [${jobInfo.jobName}]  Job "${jobInfo.jobName}" started:\n\tIndex:\t\t${jobIndex}\n\tPID:\t\t${jobsProcessInfo.jobProcess.pid}\n\tConnected:\t${jobsProcessInfo.jobProcess.connected}`)

    jobsProcessInfo.jobProcess.once('close', (code) => {
      jobsProcessInfo.running = false
      logger.info(`[JOB MANAGER] [${jobInfo.jobName}] Job finished:\n\tIndex:\t\t${jobIndex}\n\tPID:\t\t${jobsProcessInfo.jobProcess.pid}\n\tConnected:\t${jobsProcessInfo.jobProcess.connected}`)
    })
  }

  /**
   * Starts the execution of a worker in a separate process.
   * The worker loads all jobs, then finds and executes a specific job
   * that matches the command-line arguments.
   *
   * @param {Object} application - The application context.
   *
   * @throws Will throw an error if the specific job could not be found.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async runWorker (application) {
    await this.loadJobs(application)

    const job = this.jobsInfo[process.argv[3]]

    if (!job) {
      throw new Error(`Invalid Job: ${process.argv.slice(3).join(' ')}`)
    }

    await job.jobFunction()
  }
}
