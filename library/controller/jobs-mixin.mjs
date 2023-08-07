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
const logger = createLogger('Controller')

/**
 * @typedef {Object} Job
 * @property {string}   name         - The name of the job.
 * @property {string}   applicationName - The name of the application.
 * @property {string}   appName         - The name of the app.
 * @property {string}   controllerName  - The name of the controller
 * @property {string}   schedule        - The schedule of the job in cron format.
 * @property {function} jobFunction     - The function to be executed for the job.
 * @property {Object}   options         - The options for the job.
 */

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
   * A list of jobs to be executed. Each job in the list is an
   * instance of Job, which contains 'jobName', 'schedule',
   * 'jobFunction', and 'options'.
   *
   * @type {Job[]}
   */
  jobsList = []

  /**
   * Lista de Workers
   * @type {[]}
   */
  workersList = []

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
    if (this.jobsList.some(job => job.name === name)) {
      throw new Error(`Job "${name}" already exists.`)
    }

    this.jobsList.push({
      applicationName: this.applicationName,
      appName: this.appName,
      controllerName: this.controllerName,
      name,
      schedule,
      jobFunction,
      options
    })
  }

  /**
   * Cria workees para processar determinado job
   *
   * @param {string} name Nome do Grupo de workes
   * @param {string} jobName  Nome da tarefa que será processda
   * @param options Configuração dos workers
   */
  createWorkers (name, jobName, options) {
    if (this.workersList.some(job => job.workersList === name)) {
      throw new Error(`Worker "${name}" already exists.`)
    }

    this.workersList.push({
      applicationName: this.applicationName,
      appName: this.appName,
      controllerName: this.controllerName,
      name,
      jobName,
      options
    })
  }

  async exit (exitCode) {
    logger.debug(`Exiting controller "${this.completeIndentification}..."`)
    await WorkerRunner.exitProcess(exitCode)
  }

  /**
   * Loading jobs
   *
   * Optional abstract method, used for defining jobs.
   *
   * Can be overridden in a subclass if custom job definitions are needed.
   */
  async jobs () {
    logger.debug(`No jobs configured in ${this.completeIndentification}.`)
  }

  /**
   * Inicialização, executado para todos os jobs
   * // TODO: Migrar para metodos executado dentro de jobs, ex: this.jobSetup(function)
   * Roda no worker
   * @returns {Promise<void>}
   */
  async jobSetup () {
    logger.debug(`No jobsSetup configured in ${this.completeIndentification}.`)
  }

  /**
   * Executado depois do job finalizar
   // TODO: Migrar para metodos executado dentro de jobs, ex: this.jobTeardown(function)
   * Roda no worker
   * @returns {Promise<void>}
   */
  async jobTeardown () {
    logger.debug(`No jobTeardown configured in ${this.completeIndentification}.`)
  }
}
