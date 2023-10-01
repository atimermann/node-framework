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
 * TODO: URGENTE - URGENTE - REFACTORUNG - Criar CLsses para Worker, Jobs e documentar relacionamento entre eles, migrar métodos
 *
 */
import JobManager from './job-manager.mjs'
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

  /**
   * Creates user-defined workers.
   *
   * @param {Object} application - The application object to get controllers from.
   * @returns {void}
   */
  static createUserWorkers (application) {
    for (const controller of application.getControllers()) {
      logger.debug(`Loading controller: ${controller.completeIndentification}`)
      for (const workerInfo of controller.workersList) {
        const job = JobManager.getJob(workerInfo.applicationName, workerInfo.appName, workerInfo.controllerName, workerInfo.jobName)
        job.workerName = workerInfo.name
        this.createWorker(workerInfo.name, job, true, false, workerInfo.options)
      }
    }
  }

  /**
   * Creates workers for all the jobs that have been scheduled. Each job is assigned a worker
   * that will be responsible for executing the job as per its schedule.
   *
   * TODO: Verificar necessidade de um metodo para isso, talvez criar por demanda
   * @static
   */
  static createScheduledWorkers (jobs) {
    for (const [, job] of Object.entries(jobs)) {
      if (job.schedule) {
        job.workerName = `${job.name}-${job.uuid}`
        this.createWorker(job.workerName, job, false, true, {})
      }
    }
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

    const newWorker = Worker.create(name, job, persistent, auto, options)

    newWorker.on('processError', jobProcess => {
      this.events.emit('processError', jobProcess)
    })

    this.workers.push(newWorker)
    this.indexedWorkers[newWorker.name] = newWorker
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
    // console.log('[WorkerManager]', 'Check Workers:')

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
