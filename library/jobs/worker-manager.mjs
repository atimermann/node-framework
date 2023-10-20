/**
 * Created on 04/07/2023
 *
 * /worker-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * @typedef {import('./worker.mjs').default} Worker
 *
 * TODO: Criar controle de processos zumbis
 * TODO: Parametrizar delay
 * TODO: Parametrizar options for workers
 */

/**
 *  `run` event.
 *
 * @event WorkerManager#run
 *
 * @type {object}
 * @property {Worker} worker - Worker who started new execution
 */

import createLogger from '../logger.mjs'
import { EventEmitter } from 'node:events'
import Worker from './worker.mjs'

const logger = createLogger('WorkerManager')

/**
 * Manages and oversees all workers.
 *
 * Note: A `Worker` in this context doesn't represent the job's execution,
 * but rather the entity executing a given job. It gets initialized,
 *
 * @fires WorkerManager#run
 */
export default class WorkerManager {
  /**
   * List of workers
   * @type {Worker[]}
   */
  static workers = []

  /**
   * Workers dictionary, indexed by name
   *
   * @type {Object.<string, Worker>}
   */
  static indexedWorkers = {}

  /**
   * Flag that indicates that workManager is in the verification phase
   * TODO: Validar necessidade
   *
   * @type {boolean}
   */
  static checking = false

  /**
   * EventEmitter
   * @type {module:events.EventEmitter}
   */
  static events = new EventEmitter()

  /**
   * Starts Worker Manager
   *
   * @returns {Promise<void>}
   */
  static async init () {
    if (this.workers.length > 0) {
      await this.runPersistentWorkers()
      await this.monitorWorkersHealth()
    }
  }

  /**
   * Add a new Worker
   * @param {Worker} worker
   */
  static addWorker (worker) {
    logger.info(`Add new Worker: ${worker}`)

    if (this.indexedWorkers[worker.name]) {
      throw new Error(`Worker "${worker.name}" already exists.`)
    }

    worker.on('run', () => {
      this.events.emit('run', worker)
    })

    worker.on('processError', jobProcess => {
      this.events.emit('processError', worker, jobProcess)
    })

    worker.on('processLog', (jobProcess, data) => {
      this.events.emit('processLog', worker, jobProcess, data)
    })

    this.workers.push(worker)
    this.indexedWorkers[worker.name] = worker
  }

  /**
   * Creates a new worker.
   *
   * @param {string} name - The name of the worker.
   * @param {Object} job - The job associated with the worker.
   * @param {boolean} persistent - Whether the worker is persistent.
   * @param {boolean} auto  - automatically created
   * @param {Object} options - The options for the worker.
   *
   * @returns {Worker}
   */
  static createWorker (name, job, persistent, auto, options = {}) {
    const newWorker = Worker.create({
      name,
      job,
      persistent,
      auto,
      options
    })

    this.addWorker(newWorker)

    return newWorker
  }

  /**
   * Starts execution of persistent workers.
   * @returns {Promise<void>}
   */
  static async runPersistentWorkers () {
    for (const worker of this.workers) {
      if (worker.persistent) {
        await worker.run()
      }
    }
  }

  /**
   * Monitors workers health at regular intervals.
   */
  static monitorWorkersHealth () {
    // TODO: Parametrizar tempo de verificação
    setInterval(() => {
      this.verifyWorkersHealth()
    }, 30 * 1000) // verifica a cada 30 segundos
  }

  /**
   * Checks the health of all workers.
   */
  static verifyWorkersHealth () {
    if (this.checking) return

    logger.info('Checking Health')

    this.checking = true

    for (const worker of this.workers) {
      worker.checkHealth()
    }

    this.checking = false
  }

  /**
   * returns worker information for monitoring
   * @returns {{}}
   */
  static getWorkersInformation () {
    return this.indexedWorkers
  }
}
