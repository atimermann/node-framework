/**
 * **Created on 07/06/2023**
 *
 * library/jobs/job-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */
import cron from 'node-cron'
import crypto from 'crypto'
import WorkerManager from './worker-manager.mjs'
import Config from '../config.mjs'

import createLogger from '../logger.mjs'

const logger = createLogger('JobManager')

/**
 * Represents a Job object in the system. This object holds the necessary details
 * required to manage a job in the application.
 *
 * @typedef {Object} Job
 * @property {string} applicationName - Name of the application that the job is associated with.
 * @property {string} appName - Name of the app under which the job falls.
 * @property {string} controllerName - Name of the controller managing the job.
 * @property {string} name - Unique name identifier for the job.
 * @property {function} jobFunction - Function definition that performs the actual job task.
 * @property {string} schedule - A cron-formatted string that represents the job's schedule.
 * @property {string} uuid - The unique identifier for the job, generated using the job's application name, app name, controller name, and job name.
 * @property {string} workerName - The name of the worker assigned to execute the job.
 * @property {boolean} persistent - Whether the job is persistent or not.
 * @property {Object} options - The options for the job worker.
 * @property {Array} jobProcesses - Array of job processes associated with this job.
 */

export default class JobManager {
  /**
   * A static object property holding a collection of all jobs managed by the system.
   * The jobs are stored in key-value pairs, where each key is a unique hash generated
   * for the job and the value is the job's details.
   *
   * @typedef {Object.<string, Job>} staticJobs
   */

  static jobs = {}

  /**
   * Initializes the Job Manager. This involves setting up the worker environment
   * and starting the job schedules.
   *
   * @param {import('../application.mjs').Application} application - The application context within which the job manager operates.
   *
   * @returns {Promise<void>} A promise that resolves when the Job Manager has been initialized.
   * @static
   */
  static async run (application) {
    logger.info('Initializing...')

    // ============================================
    // Carrega Jobs e Workers definido pelo usuario
    // ============================================
    await this.loadJobsAndWorkers(application)

    // ============================================
    // Cria Workers
    // ============================================
    this.createScheduleWorkers()
    await WorkerManager.createUserWorkers(application)

    if (WorkerManager.workers.length > 0) {
      // ============================================
      // Executa Workers
      // ============================================
      await this.startScheduleJob()
      await WorkerManager.startPersistentWorkers()

      // ============================================
      // Monitora Workers
      // ============================================

      await WorkerManager.monitorWorkersHealth()
    }
  }

  /**
   * Loads the job and worker details from the user-defined application context.
   * This involves scanning through all the controllers and extracting the job details.
   *
   * @param {import('../application.mjs').Application} application - The application context within which to find the jobs.
   *
   * @returns {Promise<void>} A promise that resolves when all jobs and workers have been loaded.
   * @static
   */

  static async loadJobsAndWorkers (application) {
    logger.info('Load jobs and Workers')
    for (const controller of application.getControllers()) {
      await controller.jobs()

      for (const job of controller.jobsList) {
        job.uuid = this.createJobUUID(job.applicationName, job.appName, job.controllerName, job.name)
        this.jobs[job.uuid] = job

        logger.info(`Loading Job: "${job.name}" UUID:  ${job.uuid}`)
      }
    }
  }

  /**
   * Creates workers for all the jobs that have been scheduled. Each job is assigned a worker
   * that will be responsible for executing the job as per its schedule.
   *
   * @static
   */
  static createScheduleWorkers () {
    for (const [, job] of Object.entries(this.jobs)) {
      if (job.schedule) {
        job.workerName = `${job.name}-${job.uuid}`

        logger.info(`Creating schedule worker: "${job.workerName}". Schedule: "${job.schedule}"`)
        WorkerManager.createWorker(job.workerName, job, false)
      }
    }
  }

  /**
   * Starts all the scheduled jobs. This involves initiating the execution of each job
   * as per its predefined schedule.
   *
   * @returns {Promise<void>} A promise that resolves when all scheduled jobs have started execution.
   * @static
   */
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
   * Schedules a job to run at predefined intervals. This involves creating a cron job
   * that triggers the job execution as per its schedule.
   *
   * @param {Job} job - The job object that needs to be scheduled.
   * @returns {Promise<void>} A promise that resolves when the job has been scheduled.
   * @static
   */
  static async schedulingJob (job) {
    cron.schedule(job.schedule, async () => {
      try {
        await this.runJob(job)
      } catch (error) {
        console.error(error)
      }
    }, {
      scheduled: true,
      timezone: Config.get('httpServer.timezone')
    })
  }

  /**
   * Starts the execution of a job. This involves spawning a child process
   * that executes the job's function.
   *
   * @param {Job} job - The job object that needs to be executed.
   * @returns {Promise<void>} A promise that resolves when the job starts execution.
   * @static
   */
  static async runJob (job) {
    logger.info(`Running job: "${job.name}" Schedule: "${job.schedule}" Worker: "${job.workerName}"`)
    await WorkerManager.startWorkerProcesses(job.workerName)
  }

  /**
   * Retrieves a Job instance from worker attributes. This involves searching through
   * the static job collection and returning the job that matches the given attributes.
   *
   * @param {string} applicationName - The name of the application the job is associated with.
   * @param {string} appName - The name of the app under which the job falls.
   * @param {string} controllerName - The name of the controller managing the job.
   * @param {string} name - The name of the job.
   *
   * @returns {Job} The job instance that matches the given attributes.
   * @static
   */
  static getJob (applicationName, appName, controllerName, name) {
    const jobUUID = this.createJobUUID(applicationName, appName, controllerName, name)
    const job = this.jobs[jobUUID]

    if (!job) {
      throw new Error(`Job "${name}" does not exist in the Application "${applicationName}", App: "${appName}", Controller: "${controllerName}".`)
    }

    return job
  }

  /**
   * Generates a unique UUID for a job. This UUID is based on the job's
   * application name, app name, controller name, and job name.
   *
   * @method createJobUUID
   * @param {string} applicationName - The name of the application the job is associated with.
   * @param {string} appName - The name of the app under which the job falls.
   * @param {string} controllerName - The name of the controller managing the job.
   * @param {string} name - The name of the job.
   * @returns {string} A unique UUID for the job.
   * @static
   */
  static createJobUUID (applicationName, appName, controllerName, name) {
    const uniqueString = `${applicationName}${appName}${controllerName}${name}`
    return crypto.createHash('md5').update(uniqueString).digest('hex')
  }
}
