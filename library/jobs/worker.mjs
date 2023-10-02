/**
 * **Created on 07/06/2023**
 *
 * library/jobs/worker.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 *   @typedef {import('./job-process.mjs').default} JobProcess
 *   @typedef {import('./job.mjs').default} Job
 *
 */

import createLogger from '../logger.mjs'
import { EventEmitter } from 'events'
import JobProcess from './job-process.mjs'

const logger = createLogger('WorkerManager')

export default class Worker extends EventEmitter {
  /**
   * The name of the worker.
   *
   * @type {string}
   */
  name

  /**
   * The job associated with the worker.
   * @type {Job}
   */
  job

  /**
   * Whether the worker is persistent.
   * @type {boolean}
   */
  persistent

  /**
   * If the worker was created automatically by the manager
   * @type {boolean}
   */
  auto

  /**
   * The options for the worker.
   * @type {{}}
   */
  options = {}

  /**
   *  jobProcess list
   *  @type {JobProcess[]}
   */
  jobProcesses = []

  /**
   *  Instancia um novo worker
   *
   * @param name
   * @param job
   * @param persistent
   * @param auto
   * @param options
   * @returns {Worker}
   */
  static create ({
    name,
    job,
    persistent,
    auto,
    options = {}
  }) {
    logger.info(`Creating worker: "${name}" Job: "${job.name}" Persistent: "${persistent}" Schedule: "${job.schedule}"`)

    const worker = new this()
    worker.name = name
    worker.job = job
    worker.persistent = persistent
    worker.auto = auto
    worker.options = options

    return worker
  }

  /**
   * Run processes from this worker
   *
   * @returns {Promise<void>}
   */
  async runProcess () {
    if (this.jobProcesses.length > 0) {
      logger.info(`Restarting Worker: "${this.name}" Job: "${this.job.name}" Persistent: "${this.persistent}"`)
      await this.restartProcesses()
    } else {
      const concurrency = this.options.concurrency || 1
      logger.info(`Starting Worker: "${this.name}" Job: "${this.job.name}" Persistent: "${this.persistent}" Concurrency: ${concurrency}`)
      for (let i = 1; i <= concurrency; i++) {
        const jobProcess = JobProcess.create(this, `#${i}`, this.options)

        jobProcess.on('error', () => {
          this.emit('processError', jobProcess)
        })

        jobProcess.on('log', data => {
          this.emit('processLog', jobProcess, data)
        })

        this.jobProcesses.push(jobProcess)
      }
    }
  }

  /**
   * Restart jobs for a specific worker.
   */
  async restartProcesses () {
    for (const jobProcess of this.jobProcesses) {
      await jobProcess.restart()
    }
  }

  /**
   * Checks the health of processes (if they are running)
   */
  checkHealth () {
    if (this.persistent) {
      for (const jobProcess of this.jobProcesses) {
        jobProcess.checkHealth()
      }
    }
  }
}
