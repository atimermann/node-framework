/**
 * **Created on 07/06/2023**
 *
 * library/worker-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * Class responsible for execution in a separate process.
 *
 * @typedef {import('./job.mjs').default} Job
 *
 */

import { logger } from '../../index.mjs'
import JobManager from './job-manager.mjs'

export default class WorkerRunner {
  /**
   * Job running
   * @type {Job}
   * @static
   */
  static job = {}

  /**
   * Pid of parent process
   * @type {*}
   */
  static parentPid = undefined

  /**
   * This method is execution of a worker in a separate process.
   * It loads all jobs and executes the specific job that matches the command-line arguments.
   *
   * @param {import('../application.mjs').Application} application - The application context.
   *
   * @throws Will throw an error if the specific job could not be found.
   *
   * @returns {Promise<void>}
   *
   * @static
   */
  static async run (application) {
    this.parentPid = process.ppid

    const [, , , applicationName, appName, controllerName, jobName] = process.argv

    await JobManager.load(application)

    this.job = JobManager.getJob(
      applicationName,
      appName,
      controllerName,
      jobName
    )

    this._createProcessListeners(this.job)

    for (const setupFunction of this.job.setupFunctions) {
      logger.info(`Running job setup from "${this.job.name}" `)
      await setupFunction()
    }

    logger.info(`Running job "${this.job.name}" `)
    await this.job.jobFunction()

    for (const teardownFunction of this.job.teardownFunctions) {
      logger.info(`Running job teaddown from  "${this.job.name}" `)
      await teardownFunction()
    }
  }

  static async exitProcess (exitCode = 0) {
    await this._exitProcess(this.job, exitCode)
  }

  /**
   * Sets up a listener for the SIGINT event, which is triggered when the user presses Ctrl+C.
   * The application then calls the 'jobTeardown' method of the controller and finally terminates itself.
   * SIGKILL and SIGTERM should be handled by the application.
   *
   * @param {Job} job - The Job in execution
   *
   * @returns {void}
   *
   * @static
   */
  static _createProcessListeners (job) {
    process.once('SIGINT', async () => {
      await this._exitProcess(job)
    })

    // Close if disconnected from parent
    process.on('disconnect', async () => {
      logger.error('Parent disconnected. Closing...')
      await this._exitProcess(job)
    })

    // check if parent is active
    setInterval(async () => {
      try {
        logger.debug('Check parent...')
        // Transmit a neutral signal (0) to verify if the parent responds
        process.kill(this.parentPid, 0)
      } catch (err) {
        logger.error('Parent disconnected. Closing...')
        await this._exitProcess(this.job)
      }
    }, 10000) // Check every second
  }

  /**
   * Finish process
   *
   * @param {Job} job - The Job in execution
   * @param exitCode
   * @returns {Promise<void>}
   * @private
   */
  static async _exitProcess (job, exitCode = 0) {
    try {
      for (const teardownFunction of job.teardownFunctions) {
        logger.info(`Running job teardown on ERROR from  "${this.job.name}" `)
        await teardownFunction()
      }
    } catch (error) {
      console.error('Error during teardown:', error)
    } finally {
      logger.info(`Process closed! PID: ${process.pid}`)
      process.exit(exitCode)
    }
  }
}
