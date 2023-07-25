/**
 * **Created on 07/06/2023**
 *
 * library/worker-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

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

export default class JobWorker {
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
    const targetController = this.getJobController(application)

    if (!targetController) {
      throw new Error('Controller not found for the given parameters.')
    }

    await targetController.jobs()

    for (const job of targetController.jobsList) {
      this.jobs[job.name] = job
    }

    const targetJobName = process.argv[6]
    const targetJob = this.jobs[targetJobName]

    if (!targetJob) {
      throw new Error(`Job '${targetJobName}' not found.`)
    }

    await targetController.jobSetup()

    // Se receber SIGINT, finaliza (SIGKILL e SIGTERM devem ser tratado pela aplicação)
    process.once('SIGINT', async function () {
      await targetController.jobTeardown()
      process.exit(0)
    })

    await targetJob.jobFunction()
    await targetController.jobTeardown()
  }

  /**
   * This method is responsible for finding and returning a specific controller
   * that matches the command-line arguments.
   *
   * @static
   */
  static getJobController (application) {
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
