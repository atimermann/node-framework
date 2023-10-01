/**
 * **Created on 07/06/2023**
 *
 * library/jobs/job-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */
import cron from 'node-cron'
import WorkerManager from './worker-manager.mjs'
import Config from '../config.mjs'
import cloneDeep from 'lodash/cloneDeep.js'
import createLogger from '../logger.mjs'
import Job from './job.mjs'

const logger = createLogger('JobManager')

const applicationEnabled = Config.get('jobManager.applicationsEnabled', 'array')
const appsEnabled = Config.get('jobManager.appsEnabled', 'array')
const controllersEnabled = Config.get('jobManager.controllersEnabled', 'array')

const SETUP_FUNCTION = 1
const TEARDOWN_FUNCTION = 2

export default class JobManager {
  /**
   * A static object property holding a collection of all jobs managed by the system.
   * The jobs are stored in key-value pairs, where each key is a unique hash generated
   * for the job and the value is the job's details.
   *
   * @typedef {Object.<string, Job>} staticJobs
   */

  static jobs = {}

  static jobSetupAndTeadDownFunctions = []

  /**
   * Carrega Manager
   * (carrega jobs and workers)
   *
   * @param application
   * @returns {Promise<void>}
   */
  static async load (application) {
    await this.loadJobsAndWorkersFromController(application)
    this._configureSetupAndTeardownFunctions()
  }

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

    await this.load(application)

    this.createScheduledWorkers()

    await this.startScheduleJob()
    await WorkerManager.run()
  }

  /**
   * Defines startup functions for jobs belonging to the specified application, app and controller.
   * If null defines for all jobs.
   *
   * @param jobSetupFunction
   * @param applicationName
   * @param appName
   * @param controllerName
   */
  static setSetupFunction (jobSetupFunction, applicationName, appName, controllerName) {
    this.jobSetupAndTeadDownFunctions.push({
      type: SETUP_FUNCTION,
      jobSetupFunction,
      applicationName,
      appName,
      controllerName
    })
  }

  /**
   * Defines teardown functions to the specified application, app and controller.
   * If null defines for all jobs.
   *
   * Persistent jobs, will only run in case of error
   *
   * @param jobTeardownFunction
   * @param applicationName
   * @param appName
   * @param controllerName
   */
  static setTeardownFunction (jobTeardownFunction, applicationName, appName, controllerName) {
    this.jobSetupAndTeadDownFunctions.push({
      type: TEARDOWN_FUNCTION,
      jobTeardownFunction,
      applicationName,
      appName,
      controllerName
    })
  }

  /**
   * Configures setup and teardown functions for all system jobs according to application, app and controller
   * @private
   */
  static _configureSetupAndTeardownFunctions () {
    for (const [, job] of Object.entries(this.jobs)) {
      const jobSetupAndTeadDownFunctions = this._filterFunctiontoJob(job)

      for (const jobSetupAndTeadDownFunction of jobSetupAndTeadDownFunctions) {
        if (jobSetupAndTeadDownFunction.type === SETUP_FUNCTION) {
          job.setupFunctions.push(jobSetupAndTeadDownFunction.jobSetupFunction)
        } else if (jobSetupAndTeadDownFunction.type === TEARDOWN_FUNCTION) {
          job.teardownFunctions.push(jobSetupAndTeadDownFunction.jobTeardownFunction)
        }
      }
    }
  }

  /**
   * Filter list of setup and teardown functions for specific job
   *
   * @param job
   * @returns {*[]}
   * @private
   */
  static _filterFunctiontoJob (job) {
    return this.jobSetupAndTeadDownFunctions.filter(jobSetupFunction => {
      if (jobSetupFunction.applicationName && jobSetupFunction.applicationName !== job.applicationName) {
        return false
      }
      if (jobSetupFunction.appName && jobSetupFunction.appName !== job.appName) {
        return false
      }
      if (jobSetupFunction.controllerName && jobSetupFunction.controllerName !== job.controllerName) {
        return false
      }
      return true
    })
  }

  /**
   * Creates workers for all the jobs that have been scheduled. Each job is assigned a worker
   * that will be responsible for executing the job as per its schedule.
   *
   * @static
   */
  static createScheduledWorkers () {
    for (const [, job] of Object.entries(this.jobs)) {
      if (job.schedule) {
        job.workerName = `${job.name}-${job.uuid}`
        WorkerManager.createWorker(job.workerName, job, false, true, {})
      }
    }
  }

  /**
   * Add a new job
   *
   * @param {Job} job
   */
  static addJob (job) {
    logger.info(`Add new Job: ${job}`)

    if (this.jobs[job.name]) {
      throw new Error(`Job "${job.name}" already exists.`)
    }

    // Does not load if set not to load
    if (applicationEnabled && (!Array.isArray(applicationEnabled) || !applicationEnabled.includes(job.applicationName))) {
      logger.info(`Application "${job.applicationName}" disabled!`)
      return
    }

    if (appsEnabled && (!Array.isArray(appsEnabled) || !appsEnabled.includes(job.appName))) {
      logger.info(`App "${job.appName}" disabled!`)
      return
    }

    if (controllersEnabled && (!Array.isArray(controllersEnabled) || !controllersEnabled.includes(job.controllerName))) {
      logger.info(`Controller "${job.controllerName}" disabled!`)
      return
    }

    this.jobs[job.uuid] = job
    logger.info(`Loading Job: "${job.name}" UUID:  ${job.uuid}`)
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

  static async loadJobsAndWorkersFromController (application) {
    logger.info('Loading jobs and Workers from controllers...')
    for (const controller of application.getControllers()) {
      logger.info(`Loading "${controller.completeIndentification}"...`)
      await controller.jobs()
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
    await WorkerManager.runWorkerProcesses(job.workerName)
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
    const jobUUID = Job.createUUID(applicationName, appName, controllerName, name)
    const job = this.jobs[jobUUID]

    if (!job) {
      throw new Error(`Job "${name}" does not exist in the Application "${applicationName}", App: "${appName}", Controller: "${controllerName}".`)
    }

    return job
  }

  /**
   * Returns information about jobs for monitoring
   *
   * TODO: Assume apenas um worker pro job, se tiver mais de um pega ultimo necessario fazer tratativa
   *
   * @returns {{}}
   */
  static getJobsInformation () {
    const clonedJobs = cloneDeep(this.jobs)

    const workers = WorkerManager.getWorkersInformation()

    // Associates job with the list of workers that process it
    Object.keys(workers).forEach((key) => {
      const worker = workers[key]

      if (!worker.job) return
      const relationJob = clonedJobs[worker.job.uuid]

      // Init Vars
      if (!relationJob.workers) relationJob.workers = []
      if (relationJob.concurrency === undefined) relationJob.concurrency = 0

      if (!relationJob) return

      if (worker.auto) {
        relationJob.workers.push('-')
      } else {
        relationJob.workers.push(worker.name)
      }

      relationJob.persistent = worker.persistent

      // Adiciona apenas o ultimo
      relationJob.concurrency = worker.options?.concurrency
      if (relationJob.concurrency === undefined) {
        relationJob.concurrency = 1
      }

      // Status
      worker.jobProcesses.length === 0
        ? relationJob.status = 'Aguardando'
        : relationJob.status = `Executando[${worker.jobProcesses.length}]`
    })

    return clonedJobs
  }
}
