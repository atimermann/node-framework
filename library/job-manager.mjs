/**
 * **Created on 07/06/2023**
 *
 * library/job-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */
import { logger } from './logger.js'
import cron from 'node-cron'
import config from 'config'
import { fork } from 'child_process'
import crypto from 'crypto'
import WorkerManager from './worker-manager.mjs'

/**
 * Represents the information related to a child job process.
 *
 * @typedef {Object} Job
 * @property {string} applicationName - The name of the application the job belongs to.
 * @property {string} appName - The name of the app the job belongs to.
 * @property {string} controllerName - The name of the controller the job belongs to.
 * @property {string} name - The name of the job.
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
   *     name: 'Job1',
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
   * Initializes the Job Manager.
   *
   * @param {import('./application.js').Application} application - The application context.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async run (application) {
    console.log('[JOB MANAGER] Initializing...')

    // ============================================
    // Carrega Jobs e Workers definido pelo usuario
    // ============================================
    await this.loadJobsAndWorkers(application)

    // ============================================
    // Cria Workers
    // ============================================
    this.createScheduleWorkers()
    await WorkerManager.createUserWorkers(application)

    // ============================================
    // Executa Workers
    // ============================================
    await this.startScheduleJob()
    await WorkerManager.startPersistentWorkers()

    // ============================================
    // Monitora Workers
    // ============================================
    await WorkerManager.monitorWorkersHealth()
    logger.debug('Job Manager Loaded!')
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
   * @param {import('./application.js').Application} application - The application context.
   *
   * @returns {Promise<void>} This method doesn't return any value but encapsulates its operations with a Promise due to the async operations involved.
   *
   * @static
   */
  static async loadJobsAndWorkers (application) {
    console.log('Load Jobs and Workers')
    for (const controller of await application.getControllers()) {
      await controller.jobs()

      for (const job of controller.jobsList) {
        job.uuid = this.createJobUUID(job.applicationName, job.appName, job.controllerName, job.name)
        this.jobs[job.uuid] = job

        console.log(`JOB:\n\tUUID:  ${job.uuid}\n\tName:  ${job.name}`)
      }
    }
  }

  /**
   * Cria Workers para os jobs agendados
   */
  static createScheduleWorkers () {
    for (const [, job] of Object.entries(this.jobs)) {
      if (job.schedule) {
        console.log('createScheduleWorkers:', job.name)

        job.workerName = `${job.name}-${job.uuid}`
        WorkerManager.createWorker(job.workerName, job, false)
      }
    }
  }

  static async startScheduleJob () {
    const promises = []
    for (const [, job] of Object.entries(this.jobs)) {
      if (job.schedule) {
        if (job.schedule === 'now') {
          promises.push(this.runJob(job))
        } else if (job.schedule) {
          promises.push(this.schedulingJob(job))
        }
      }
    }
    await Promise.all(promises)
  }

  /**
   * Schedules a job to be run based on the job's predefined schedule.
   *
   * This method uses a cron scheduler to execute the job at the defined intervals.
   * Each job is identified by a unique job index and the details of the job are provided
   * in the job object. The jobsProcess object contains the state of the job process.
   *
   * @param {string} jobIndex - The unique index for the job to be scheduled.
   * @param {Job} job - The job object containing all the details for the job.
   * @param {JobProcess} jobProcess - Object containing information about the job's process status. It includes properties that track whether the job is currently running or is being killed.
   *
   * @type {Promise<void>} promises
   *
   * @static
   */
  static async schedulingJob (job) {
    logger.info(`[JOB MANAGER] [${job.name}] Scheduling...`)

    cron.schedule(job.schedule, async () => {
      try {
        await this.runJob(job)
      } catch (error) {
        console.error(error)
      }
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
   * @param {string} jobIndex - The unique index of the job which will be used to start or terminate a job process.
   * @param {Job} job - Object containing information about the job. It includes properties like the job's name, schedule, etc.
   * @param {JobProcess} jobProcess - Object containing information about the job's process status. It includes properties that track whether the job is currently running or is being killed.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async runJob (job) {
    console.log('[WorkerManager]', `Executando ${job.workerName}`)
    await WorkerManager.startWorkerProcesses(job.workerName)
  }

  /**
   * Obtém uma instancia de Job à partir de atrivutos do worker
   *
   * @param applicationName
   * @param appName
   * @param controllerName
   * @param name
   * @returns {{name: string, schedule: string, jobFunction: Function, appName: string, controllerName: string, applicationName: string}}
   */
  static getJob (applicationName, appName, controllerName, name) {
    const jobUUID = this.createJobUUID(applicationName, appName, controllerName, name)
    const job = this.jobs[jobUUID]

    if (!job) {
      throw new Error(`Job "${name}" does not exist in the Application "${applicationName}", App: "${appName}", Controller: "${controllerName}".`)
    }

    return job
  }

  static createJobUUID (applicationName, appName, controllerName, name) {
    return crypto.createHash('md5').update(applicationName + appName + controllerName + name).digest('hex')
  }
}
