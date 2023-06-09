/**
 * Created on 04/07/2023
 *
 * /worker-manager.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * TODO: Criar controle de processos zumbis
 * TODO: Parametrizar delay
 *
 */
import { fork } from 'child_process'
import JobManager from './job-manager.mjs'
import createLogger from '../logger.mjs'

const logger = createLogger('WorkerManager')

export default class WorkerManager {
  static workers = []
  static indexedWorkers = {}
  static checking = false

  /**
   * Creates user-defined workers.
   * @param {Object} application - The application object to get controllers from.
   * @returns {Promise<void>}
   */
  static async createUserWorkers (application) {
    for (const controller of await application.getControllers()) {
      for (const worker of controller.workersList) {
        const job = JobManager.getJob(worker.applicationName, worker.appName, worker.controllerName, worker.jobName)
        this.createWorker(worker.name, job, true, worker.options)
      }
    }
  }

  /**
   * Creates a new worker.
   * @param {string} name - The name of the worker.
   * @param {Object} job - The job associated with the worker.
   * @param {boolean} persistent - Whether the worker is persistent.
   * @param {Object} options - The options for the worker.
   */
  static createWorker (name, job, persistent, options = {}) {
    logger.info(`Creating worker: "${name}" Job: "${job.name}" Persistent: "${persistent}"`)

    const newWorker = {
      name,
      job,
      persistent,
      options,
      jobProcesses: []
    }

    this.workers.push(newWorker)
    this.indexedWorkers[newWorker.name] = newWorker
  }

  /**
   * Starts execution of persistent workers.
   * @returns {Promise<void>}
   */
  static async startPersistentWorkers () {
    for (const worker of this.workers) {
      if (worker.persistent) {
        await this.startWorkerProcesses(worker.name)
      }
    }
  }

  /**
   * Executes workers.
   * @param {string} workerName - The name of the worker.
   * @returns {Promise<void>}
   */
  static async startWorkerProcesses (workerName) {
    const worker = this.indexedWorkers[workerName]

    if (worker.jobProcesses.length > 0) {
      logger.info(`Restarting Worker: "${workerName}" Job: "${worker.job.name}" Persistent: "${worker.persistent}"`)
      await this.restarWorkersProcesses(worker)
    } else {
      const concurrency = worker.options.concurrency || 1
      logger.info(`Starting Worker: "${workerName}" Job: "${worker.job.name}" Persistent: "${worker.persistent}" Concurrency: ${concurrency}`)
      for (let i = 1; i <= concurrency; i++) {
        worker.jobProcesses.push(this.createProcess(worker.job, `#${i}`, worker.options))
      }
    }
  }

  /**
   * Monitors workers health at regular intervals.
   */

  static async restarWorkersProcesses (worker) {
    for (const jobProcess of worker.jobProcesses) {
      if (jobProcess.killing) {
        logger.warn(`Job killing! Waiting... Worker: "${worker.name}" Job: "${worker.job.name}"`)
        continue
      }
      if (jobProcess.running || (jobProcess.childProcess && jobProcess.childProcess.connected)) {
        await this.restartJobProcess(worker.job, jobProcess)
      } else {
        this.runProcess(worker.job, jobProcess)
      }
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
   * Creates a new process.
   * @param {Object} job - The job for which to create a process.
   * @param {string} id - Identificador do processo
   * @param {Object} options - The options for creating the process.
   * @returns {{}}
   */
  static createProcess (job, id, options) {
    // Criar Classe para jobProcess
    const jobProcess = {
      countClose: 0,
      killing: false,
      id
    }
    this.runProcess(job, jobProcess)

    return jobProcess
  }

  /**
   * Runs a process.
   * @param {Object} job - The job to run.
   * @param {Object} jobProcess - The process to run.
   */
  static runProcess (job, jobProcess) {
    logger.info(`Running process: Worker: "${job.workerName}" Job: "${job.name}" Process: "${jobProcess.id}"}`)
    const args = ['job', job.applicationName, job.appName, job.controllerName, job.name]

    jobProcess.childProcess = fork('./src/run.mjs', args, { silent: true })
    jobProcess.running = true

    const childLogger = createLogger(`Job ${job.name} ${jobProcess.id}`)

    jobProcess.childProcess.stdout.on('data', (data) => {
      this.logChildProcess(childLogger, data)
    })

    jobProcess.childProcess.stderr.on('data', (data) => {
      this.logChildProcess(childLogger, data)
    })

    jobProcess.childProcess.once('exit', (code, signal) => {
      jobProcess.running = false
      jobProcess.exitCode = code
      jobProcess.exitSignal = signal
      jobProcess.countClose++
    })
  }

  static logChildProcess (childLogger, data) {
    for (const line of data.toString().split('\n')) {
      try {
        const logObj = JSON.parse(line)
        const logModule = logObj.module ? `[${logObj.module}] ` : ''
        childLogger[logObj.level](`${logModule}${logObj.message}`)
      } catch (err) { /* Ignora linhas que não podem ser processada pelo JSON */
        if (line !== '') {
          childLogger.error(line)
        }
      }
    }
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
          this.verifyPersistentJobHealth(worker, jobProcess)
        }
      }
    }

    this.checking = false
  }

  /**
   * Verifies the health of persistent job processes.
   * @param {Object} worker - The worker to check.
   * @param {Object} jobProcess - The job process to check.
   */
  static verifyPersistentJobHealth (worker, jobProcess) {
    // console.log('[WorkerManager]', `PROCESS #${jobProcess.childProcess.pid} RUNNING: "${jobProcess.running}"`)

    // Verifica se Job está parado
    if (jobProcess.running === false) {
      logger.error(`Process hangout: Worker: "${worker.name}" Job: "${worker.job.name}" Process: "${jobProcess.id}"}`)
      this.runProcess(worker.job, jobProcess)
    }

    // TODO: Verifica se Job está respondendo ping/pong (com timeout)

    // TODO: Veriica se jog está conectado

    // TODO: Verifica consumo de memoria do Job

    // TODO: Verifica jobs está reiniciando muits vezes
  }

  /**
   * Restarts a job process.
   *
   * @param {Object} job - The job whose process to restart.
   * @param {Object} jobProcess - The process to restart.
   * @returns {Promise<void>}
   */
  static async restartJobProcess (job, jobProcess) {
    jobProcess.killing = true

    logger.warn(`Killing job: "${job.name}" Worker:"${job.workerName}" ID: "${jobProcess.id}"`)

    const pidToKill = jobProcess.childProcess.pid

    // Prepares callback to restart the process when finished.
    jobProcess.childProcess.once('exit', async () => {
      logger.warn(`Killing successful: "${job.name}" Worker:"${job.workerName}" ID: "${jobProcess.id}" `)
      this.runProcess(job, jobProcess)
      jobProcess.killing = false
    })

    // Send SIGNIT
    await this.sendKill('SIGINT', jobProcess.childProcess)
    if (pidToKill !== jobProcess.childProcess.pid || !jobProcess.childProcess.connected) return

    await this.sendKill('SIGTERM', jobProcess.childProcess)
    if (pidToKill !== jobProcess.childProcess.pid || !jobProcess.childProcess.connected) return

    await this.sendKill('SIGKILL', jobProcess.childProcess)
    if (pidToKill !== jobProcess.childProcess.pid || !jobProcess.childProcess.connected) return

    logger.error(`Process is stuck. It cannot be killed. Restart aborted. Job: "${job.name}" Worker:"${job.workerName}" PID: "${jobProcess.childProcess.pid}"`)
    // TODO: Controle de zumbi
    jobProcess.killing = false
  }

  /**
   * Sends a kill signal to a child process.
   * @param {string} signal - The signal to send.
   * @param {Object} childProcess - The child process to which to send the signal.
   * @returns {Promise<void>}
   */
  static async sendKill (signal, childProcess) {
    logger.warn(`SEND KILL... PID: "${childProcess.pid}" SIGNAL: "${signal}"`)
    childProcess.kill(signal)
    // Wait for 5 seconds TODO: parameterize this duration.
    await this.sleep(5000)
  }

  /**
   * Sleep function for waiting purposes.
   * TODO: Move this function to a utility module.
   *
   * @param {number} ms - Time to wait in milliseconds.
   * @returns {Promise<void>}
   */
  static async sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
