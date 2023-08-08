/**
 * **Created on 07/06/2023**
 *
 * library/worker-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * Class responsible for execution in a separate process.
 *
 */

import { logger } from '../../index.mjs'

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

export default class WorkerRunner {
  /**
   * A static property containing a collection of jobs.
   * Each job is represented as an object and indexed by a name
   *
   * @example
   * {
   *   "job_name_1": {
   *     applicationName: 'App1',
   *     appName: 'Application1',
   *     controllerName: 'Controller1',
   *     jobName: 'Job1',
   *     jobFunction: function() {...},
   *     schedule: '* * * * *'
   *   },
   *   "job_name_2": {...},
   *   ...
   * }
   *
   * @type {Object.<string, Job>}
   *
   * @static
   */
  static jobs = {}

  /**
   * Pid of parent process
   * @type {*}
   */
  static parentPid = undefined

  static targetController = undefined

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

    this.targetController = this._getJobController(application)

    if (!this.targetController) {
      throw new Error('Controller not found for the given parameters.')
    }

    await this.targetController.jobs()

    this._loadJobsFromTargetController(this.targetController.jobsList)

    const targetJobName = process.argv[6]
    const targetJob = this.jobs[targetJobName]

    if (!targetJob) {
      throw new Error(`Job '${targetJobName}' not found.`)
    }

    await this.targetController.jobSetup()
    this._createProcessListeners(this.targetController)
    await targetJob.jobFunction()
  }

  static async exitProcess (exitCode = 0) {
    await this._exitProcess(this.targetController, exitCode)
  }

  /**
   * Loads jobs from the given controller into the static jobs property of the class.
   * This method expects the controller to have a jobs method that returns a list of jobs.
   * Each job in the list is then added to the jobs property.
   *
   * @param {Array<Object>} jobsList - List of jobs to be loaded.
   *
   * @private
   * @static
   */
  static _loadJobsFromTargetController (jobsList) {
    for (const job of jobsList) {
      this.jobs[job.name] = job
    }
  }

  /**
   * Sets up a listener for the SIGINT event, which is triggered when the user presses Ctrl+C.
   * The application then calls the 'jobTeardown' method of the controller and finally terminates itself.
   * SIGKILL and SIGTERM should be handled by the application.
   *
   * @param {Object} targetController - The controller that needs to be cleaned up.
   *
   * @returns {void}
   *
   * @static
   */
  static _createProcessListeners (targetController) {
    process.once('SIGINT', async () => {
      await this._exitProcess(targetController)
    })

    // Close if disconnected from parent
    process.on('disconnect', async () => {
      logger.error('Parent disconnected. Closing...')
      await this._exitProcess(targetController)
    })

    // check if parent is active
    setInterval(async () => {
      try {
        logger.debug('Check parent...')
        // Transmit a neutral signal (0) to verify if the parent responds
        process.kill(this.parentPid, 0)
      } catch (err) {
        logger.error('Parent disconnected. Closing...')
        await this._exitProcess()
      }
    }, 10000) // Check every second
  }

  static async _exitProcess (targetController, exitCode = 0) {
    try {
      await targetController.jobTeardown()
    } catch (error) {
      console.error('Error during teardown:', error)
    } finally {
      logger.info(`Process closed! PID: ${process.pid}`)
      process.exit(exitCode)
    }
  }

  /**
   * This method is responsible for finding and returning a specific controller
   * that matches the command-line arguments.
   *
   * @private
   *
   * @static
   */
  static _getJobController (application) {
    for (const controller of application.getControllers()) {
      const isTargetController =
                controller.applicationName === process.argv[3] &&
                controller.appName === process.argv[4] &&
                controller.controllerName === process.argv[5]

      if (isTargetController) {
        return controller
      }
    }
  }
}
