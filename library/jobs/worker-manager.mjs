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

export default class WorkerManager {
  static workers = []
  static indexedWorkers = {}
  static checking = false

  /**
   * Inicializa workers definido pelo usuario
   * @param application
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
   * Cria novo worker
   * @param name
   * @param job
   * @param persistent
   * @param options
   */
  static createWorker (name, job, persistent, options = {}) {
    console.log('[WorkerManager]', `Criando Worker: ${name}, JOB: ${job.name}`)
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
   * Inicia execução de worksrs persistentes
   */
  static async startPersistentWorkers () {
    for (const worker of this.workers) {
      if (worker.persistent) {
        await this.startWorkerProcesses(worker.name)
      }
    }
  }

  /**
   * Executa workers
   *
   * @param workerName
   */
  static async startWorkerProcesses (workerName) {
    const worker = this.indexedWorkers[workerName]

    if (worker.jobProcesses.length > 0) {
      await this.restarWorkersProcesses(worker)
    } else {
      const concurrency = worker.options.concurrency || 1
      for (let i = 1; i <= concurrency; i++) {
        worker.jobProcesses.push(this.createProcess(worker.job, worker.options))
      }
    }
  }

  static async restarWorkersProcesses (worker) {
    for (const jobProcess of worker.jobProcesses) {
      // Processo está sendo tratado
      if (jobProcess.killing) {
        continue
      }
      if (jobProcess.running || (jobProcess.childProcess && jobProcess.childProcess.connected)) {
        await this.restartJobProcess(worker.job, jobProcess)
      } else {
        this.runProcess(worker.job, jobProcess)
      }
    }
  }

  static monitorWorkersHealth () {
    // TODO: Parametrizar tempo de verificação
    setInterval(() => {
      this.verifyWorkerHealth()
    }, 30 * 1000) // verifica a cada 30 segundos
  }

  /**
   * Executa um processo
   *
   * @param job
   * @param options
   * @returns {{}}
   */
  static createProcess (job, options) {
    // Criar Classe para jobProcess
    const jobProcess = {
      countClose: 0,
      killing: false
    }
    this.runProcess(job, jobProcess)

    return jobProcess
  }

  static runProcess (job, jobProcess) {
    // TODO: Parametrizar silent em options
    console.log('[WorkerManager]', `Criando Processo: ${job.name}`)
    const args = ['job', job.applicationName, job.appName, job.controllerName, job.name]

    jobProcess.childProcess = fork('./src/run.mjs', args, { silent: false })
    jobProcess.running = true
    console.log('[WorkerManager]', `NEW PID #${jobProcess.childProcess.pid} RUNNING: "${jobProcess.running}"`)

    jobProcess.childProcess.once('exit', (code, signal) => {
      jobProcess.running = false
      jobProcess.exitCode = code
      jobProcess.exitSignal = signal
      jobProcess.countClose++
    })
  }

  /**
   * Verifica saúde do worker
   */
  static verifyWorkerHealth () {
    if (this.checking) return
    this.checking = true
    console.log('[WorkerManager]', 'Check Workers:')

    for (const worker of this.workers) {
      console.log('[WorkerManager]', `Check Worker "${worker.name}" `)
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
   * Verifica saúde dos processos de  jobs persistentes
   */
  static verifyPersistentJobHealth (worker, jobProcess) {
    console.log('[WorkerManager]', `PROCESS #${jobProcess.childProcess.pid} RUNNING: "${jobProcess.running}"`)

    // Verifica se Job está parado
    if (jobProcess.running === false) {
      this.runProcess(worker.job, jobProcess)
    }

    // TODO: Verifica se Job está respondendo ping/pong (com timeout)

    // TODO: Veriica se jog está conectado

    // TODO: Verifica consumo de memoria do Job

    // TODO: Verifica jobs está reiniciando muits vezes
  }

  static async restartJobProcess (job, jobProcess) {
    jobProcess.killing = true

    const pidToKill = jobProcess.childProcess.pid

    // Prepares callback to restart the process when finished.
    jobProcess.childProcess.once('exit', async () => {
      console.log('=============================================>KIll Success!!, restart')
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

    console.error(`[JOB MANAGER][JOB MANAGER] [${job.name}] [${jobProcess.childProcess.pid}] Process is stuck. It cannot be killed. Restart aborted.`)
    // TODO: Controle de zumbi
    jobProcess.killing = false
  }

  static async sendKill (signal, childProcess) {
    // Send SIGNIT
    console.log(`[${childProcess.pid}] Send "${signal}" to process...`)
    childProcess.kill('SIGINT')

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
