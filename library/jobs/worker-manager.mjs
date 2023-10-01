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
 *
 *
 */
import createLogger from '../logger.mjs'
import { EventEmitter } from 'events'
import Worker from './worker.mjs'

const logger = createLogger('WorkerManager')

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
  static checking = false
  static events = new EventEmitter()

  static async run () {
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

    worker.on('processError', jobProcess => {
      this.events.emit('processError', jobProcess)
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
  }

  /**
   * Starts execution of persistent workers.
   * @returns {Promise<void>}
   */
  static async runPersistentWorkers () {
    for (const worker of this.workers) {
      if (worker.persistent) {
        await worker.runProcess()
      }
    }
  }

  /**
   * Executes workers.
   *
   * @param {string} workerName - The name of the worker.
   * @returns {Promise<void>}
   */
  static async runWorkerProcesses (workerName) {
    const worker = this.indexedWorkers[workerName]
    await worker.runProcess()
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

  /**
   * Retorna EventEmmiter
   * @returns {module:events.EventEmitter}
   */
  static event () {
    return this.events
  }
}
