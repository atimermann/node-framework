/**
 * Created on 28/07/23
 *
 * library/controller/jobs-mixin.mjs
 *
 * @author André Timermann <andre@timermann.com.br>
 *
 */
import createLogger from '../../library/logger.mjs'
import WorkerRunner from '../jobs/worker-runner.mjs'

import JobManager from '../jobs/job-manager.mjs'
import Job from '../jobs/job.mjs'
import Worker from '../jobs/worker.mjs'
import WorkerManager from '../jobs/worker-manager.mjs'

const logger = createLogger('Controller')

/**
 * Provides job-related functionality for extending classes.
 *
 * This mixin encapsulates logic related to job management and execution. Classes
 * that need job-related capabilities can extend this mixin to inherit its methods
 * and properties.
 *
 * @mixin
 *
 * @requires {string} Controller#appName          - Expected to be defined in the base class.
 * @requires {string} Controller#applicationName  - Expected to be defined in the base class.
 * @requires {string} Controller#controllerName   - Expected to be defined in the base class. *
 */
export default class JobsMixin {
  /**
   * Create a new job.
   *
   * @param {string} name - The name of the job.
   * @param {string|null} schedule - The schedule for the job in cron format, or null if the job is not scheduled.
   * @param {function} jobFunction - The function that will be executed when the job is processed.
   * @param {Object} [options={}] - Optional settings for the job.
   * @throws {Error} If a job with the provided name already exists.
   */
  createJob (name, schedule, jobFunction, options = {}) {
    const newJob = Job.create({
      applicationName: this.applicationName,
      appName: this.appName,
      controllerName: this.controllerName,
      name,
      schedule,
      jobFunction,
      options
    })

    JobManager.addJob(newJob)
  }

  /**
   * Creates workers to process a given job
   *
   * @param {string} name Nome do Grupo de workes
   * @param {string} jobName  Nome da tarefa que será processda
   * @param options Configuração dos workers
   */
  createWorkers (name, jobName, options) {
    const job = JobManager.getJob(this.applicationName, this.appName, this.controllerName, jobName)
    const newWorker = Worker.create({
      name,
      job,
      persistent: true,
      auto: false,
      options
    })

    WorkerManager.addWorker(newWorker)
  }

  /**
   * Defines a function that will be executed in all jobs in this controller when initializing the job
   *
   * @param {function} jobSetupFunction Function to be performed
   * @param {boolean} allApplications    Runs on all jobs in all applications
   * @param {boolean} allApps            Run all games from all apps in this application
   * @param {boolean} allControllers     Executes all jobs on all controllers in this app
   */
  jobSetup (jobSetupFunction, allApplications = false, allApps = false, allControllers = false) {
    JobManager.setSetupFunction(
      jobSetupFunction,
      allApplications ? null : this.applicationName,
      allApps ? null : this.appName,
      allControllers ? null : this.controllerName
    )
  }

  /**
   * Defines a function that will be executed in all jobs after the job is finished
   * For persistent jobs, only when an error occurs
   *
   * @param {function} jobTeardownFunction Function to be performed
   * @param {boolean} allApplications    Runs on all jobs in all applications
   * @param {boolean} allApps            Run all games from all apps in this application
   * @param {boolean} allControllers     Executes all jobs on all controllers in this app
   */
  jobTeardown (jobTeardownFunction, allApplications = false, allApps = false, allControllers = false) {
    JobManager.setTeardownFunction(
      jobTeardownFunction,
      allApplications ? null : this.applicationName,
      allApps ? null : this.appName,
      allControllers ? null : this.controllerName
    )
  }

  /**
   * Ends the execution of the job, it must always be called to perform finishing tasks.
   *
   * @param {number}  exitCode
   * @returns {Promise<void>}
   */
  async exit (exitCode = 0) {
    logger.debug(`Exiting controller "${this.completeIndentification}..."`)
    await WorkerRunner.exitProcess(exitCode)
  }

  /**
   * Loading jobs
   *
   * Optional abstract method, used for defining jobs.
   * Can be overridden in a subclass if custom job definitions are needed.
   */
  async jobs () {
    logger.debug(`No jobs configured in ${this.completeIndentification}.`)
  }
}
