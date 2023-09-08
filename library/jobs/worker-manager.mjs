/**
 * Created on 04/07/2023
 *
 * /worker-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * TODO: Criar controle de processos zumbis
 * TODO: Parametrizar delay
 * TODO: Parametrizar options for workers
 * TODO: Criar classe/objeto/typedef para worker
 *
 * TODO: URGENTE - URGENTE - REFACTORUNG - Criar CLsses para Worker, Jobs, JobProcess e documentar relacionamento entre eles, migrar métodos
 *
 */
import JobManager from './job-manager.mjs'
import createLogger from '../logger.mjs'
import { EventEmitter } from 'events'
import JobProcess from './job-process.mjs'

const logger = createLogger('WorkerManager')

export default class WorkerManager {
  static workers = []
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
      for (const worker of controller.workersList) {
        const job = JobManager.getJob(worker.applicationName, worker.appName, worker.controllerName, worker.jobName)
        job.workerName = worker.name
        this.createWorker(worker.name, job, true, false, worker.options)
      }
    }
  }

  /**
   * Creates workers for all the jobs that have been scheduled. Each job is assigned a worker
   * that will be responsible for executing the job as per its schedule.
   *
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
   * @param {boolean }auto  - automatically created
   * @param {Object} options - The options for the worker.
   */
  static createWorker (name, job, persistent, auto, options = {}) {
    logger.info(`Creating worker: "${name}" Job: "${job.name}" Persistent: "${persistent}" Schedule: "${job.schedule}"`)

    const newWorker = {
      name,
      job,
      persistent,
      options,
      auto,
      jobProcesses: []
    }

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
        await this.runWorkerProcesses(worker.name)
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

    if (worker.jobProcesses.length > 0) {
      logger.info(`Restarting Worker: "${workerName}" Job: "${worker.job.name}" Persistent: "${worker.persistent}"`)
      await this.restartWorkerProcesses(worker)
    } else {
      const concurrency = worker.options.concurrency || 1
      logger.info(`Starting Worker: "${workerName}" Job: "${worker.job.name}" Persistent: "${worker.persistent}" Concurrency: ${concurrency}`)
      for (let i = 1; i <= concurrency; i++) {
        const jobProcess = JobProcess.create(worker, `#${i}`, worker.options)

        jobProcess.on('processError', jobProcess => {
          this.events.emit('processError', jobProcess)
        })

        worker.jobProcesses.push(jobProcess)
      }
    }
  }

  /**
   * Restart jobs for a specific worker.
   */
  static async restartWorkerProcesses (worker) {
    for (const jobProcess of worker.jobProcesses) {
      await jobProcess.restart()
    }
  }

  /**
   * Monitors workers health at regular intervals.
   */
  static monitorWorkersHealth () {
    // TODO: Parametrizar tempo de verificação
    setInterval(() => {
      this.verifyWorkerHealth()
    }, 30 * 1000) // verifica a cada 30 segundos
  }

  /**
   * Checks the health of all workers.
   */
  static verifyWorkerHealth () {
    if (this.checking) return

    logger.info('Checking Health')

    this.checking = true
    // console.log('[WorkerManager]', 'Check Workers:')

    for (const worker of this.workers) {
      // console.log('[WorkerManager]', `Check Worker "${worker.name}" `)
      if (worker.persistent) {
        // Verifica se o Processo finalizou e reinicia
        for (const jobProcess of worker.jobProcesses) {
          jobProcess.checkHealth()
          // this.verifyPersistentJobHealth(worker, jobProcess)
        }
      }
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
