/**
 * **Created on 07/06/2023**
 *
 * library/jobs/job.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * @typedef {import('./worker.mjs').default} Worker
 */

import createLogger from '../logger.mjs'
import { EventEmitter } from 'events'
import crypto from 'crypto'

const logger = createLogger('WorkerManager')

/**
 * Represents a Job object in the system. This object holds the necessary details
 * to manage and execute specific tasks or processes within the application.
 * @extends EventEmitter
 */
export default class Job extends EventEmitter {

  /**
   * The unique identifier for the job, generated using the job's application name,
   * app name, controller name, and job name.
   * @type {string}
   */
  uuid

  /**
   * Name of the application that the job is associated with.
   * @type {string}
   */
  applicationName

  /**
   * Name of the app under which the job falls.
   * @type {string}
   */
  appName

  /**
   * Name of the controller managing the job.
   * @type {string}
   */
  controllerName

  /**
   * Unique name identifier for the job.
   * @type {string}
   */
  name

  /**
   * The schedule for the job in cron format, or null if the job is not scheduled.
   * @type {string|null}
   */
  schedule

  /**
   * Function definition that performs the actual job task.
   * @type {function}
   */
  jobFunction

  /**
   * Setup functions to be executed before the main job function.
   * @type {function[]}
   */
  setupFunctions = []

  /**
   * Teardown functions to be executed after the main job function.
   * @type {function[]}
   */
  teardownFunctions = []

  /**
   * The worker assigned to execute the job.
   * @type {Worker}
   */
  worker

  /**
   * Optional settings for the job.
   * @type {Object}
   */
  options

  /**
   *
   * @param applicationName
   * @param appName
   * @param controllerName
   * @param name
   * @param schedule
   * @param jobFunction
   * @param options
   * @returns {*}
   */

  static create ({
    applicationName,
    appName,
    controllerName,
    name,
    schedule,
    jobFunction,
    options = {}
  }) {

    logger.info(`Creating job "${name}"`)

    const job = new this()
    job.applicationName = applicationName
    job.appName = appName
    job.controllerName = controllerName
    job.name = name
    job.schedule = schedule
    job.jobFunction = jobFunction
    job.options = options
    job.setUUID()

    return job
  }

  /**
   * Sets UUID for the job
   * @returns {string} The generated UUID.
   */
  setUUID () {
    this.uuid = Job.createUUID(this.applicationName, this.appName, this.controllerName, this.name)
  }

  /**
   * Generates a unique UUID for the job based on its properties.
   * @param {string} applicationName
   * @param {string} appName
   * @param {string} controllerName
   * @param {string} name
   *
   * @returns {string}
   */
  static createUUID (applicationName, appName, controllerName, name) {
    const uniqueString = `${applicationName}${appName}${controllerName}${name}`
    return crypto.createHash('md5').update(uniqueString).digest('hex')
  }
}
