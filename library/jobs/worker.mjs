/**
 * **Created on 07/06/2023**
 *
 * library/jobs/worker.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 *   @typedef {import('./job-process.mjs').default} JobProcess
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
   * TODO: Colocar aqui a instancia do JOB
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

  static create (name, job, persistent, auto,  options = {}) {

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
  async runProcess(){

    if (this.jobProcesses.length > 0) {
      logger.info(`Restarting Worker: "${this.name}" Job: "${this.job.name}" Persistent: "${this.persistent}"`)
      await this.restartProcesses()
    } else {
      const concurrency = this.options.concurrency || 1
      logger.info(`Starting Worker: "${this.name}" Job: "${this.job.name}" Persistent: "${this.persistent}" Concurrency: ${concurrency}`)
      for (let i = 1; i <= concurrency; i++) {
        const jobProcess = JobProcess.create(this, `#${i}`, this.options)

        jobProcess.on('processError', jobProcess => {
          this.emit('processError', jobProcess)
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
  checkHealth(){
    // console.log('[WorkerManager]', `Check Worker "${worker.name}" `)
    if (this.persistent) {
      // Verifica se o Processo finalizou e reinicia
      for (const jobProcess of this.jobProcesses) {
        jobProcess.checkHealth()
        // this.verifyPersistentJobHealth(worker, jobProcess)
      }
    }
  }

}