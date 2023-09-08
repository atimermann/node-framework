/**
 * JobProcess class is responsible for handling the individual processes of a job.
 * Each instance of this class represents a running job process, encapsulating details such as
 * the process ID, its worker, runtime options, and state indicators (like whether it's running or being terminated).
 *
 * This class extends EventEmitter to allow monitoring and reacting to different states of the job process through various events.
 *
 * @class
 * @extends EventEmitter
 *
 * @file library/jobs/job-process.mks.mjs
 * @author André Timermann <andre@timermann.com.br>
 * @created 08/09/23
 */
import createLogger from '../logger.mjs'
import { fork } from 'child_process'
import { EventEmitter } from 'events'
import { setTimeout as sleep } from 'node:timers/promises'

const logger = createLogger('WorkerManager')

export default class JobProcess extends EventEmitter {
  /**
   * A unique identifier for the process.
   * @type {string}
   */
  id

  /**
   * The worker instance that owns this process.
   *
   * // TODO: Criar classe para worker e definir tipo aqui
   *
   */
  worker

  /**
   * Counter keeping track of the number of times the process was terminated due to errors.
   * @type {number}
   */
  countClose = 0

  /**
   * Indicates if the process is in the process of being terminated
   * @type {boolean}
   */
  killing = false

  /**
   * Indicates if the process is currently running.
   * @type {boolean}
   */
  running = false

  /**
   * The UNIX signal that was triggered when the process was terminated, e.g., SIGINT.
   * @type {string}
   */
  exitSignal

  /**
   * The exit code of the UNIX process. Any code other than 0 indicates an error.
   * @type {number}
   */
  exitCode

  /**
   * Configuration options for process execution.
   *
   * @type {{silent: boolean}}
   */
  options = {
    /**
     * Silent Log
     */
    silent: true,
    /**
     * Time to wait to kill the process
     */
    killWaitTime: 5000
  }

  /**
   *  The child process instance created by the Node.js fork method.
   * @type {import('child_process').ChildProcess}
   */
  childProcess

  /**
   * A collection of error messages generated during this process's runtime.
   * @type {[string]}
   */
  errorsMessage = []

  /**
   * Factory method to create a new JobProcess instance, set its properties, and initiate the process.
   *
   * @param {Object} worker - The worker that owns this process.
   * @param {string} id - A unique identifier for this process.
   * @param {Object} options - Additional options for this process.
   *
   * @returns {JobProcess} - A new JobProcess instance.
   */
  static create (worker, id, options = {}) {
    const process = new this()
    process.id = id
    process.options = { ...process.options, ...options }
    process.worker = worker
    process.run()

    return process
  }

  /**
   * Handles logging for the child process, parsing incoming data lines and formatting them as JSON where possible.
   *
   * @param {Object} childLogger - Logger instance for logging child process output.
   * @param {Buffer|string} data - Data from child process output.
   */
  log (childLogger, data) {
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
   * Initiates the process. Configures and starts a child process using the node.js fork method.
   * Logs the initiation details including the worker name, job name, and process ID.
   */
  run () {
    logger.info(`Running process: Worker: "${this.worker.name}" Job: "${this.worker.job.name}" Process: "${this.id}"}`)

    const args = [
      'job',
      this.worker.job.applicationName,
      this.worker.job.appName,
      this.worker.job.controllerName,
      this.worker.job.name
    ]

    // Clean errors
    this.errorsMessage.splice(0, this.errorsMessage.length)

    this.childProcess = fork('./src/run.mjs', args, { silent: this.options.silent })
    this.running = true

    const childLogger = createLogger(`Job ${this.worker.job.name} ${this.id}`)

    this.childProcess.stdout.on('data', (data) => {
      this.log(childLogger, data)
    })

    this.childProcess.stderr.on('data', (data) => {
      this.errorsMessage.push(data)
      this.log(childLogger, data)
    })

    this.childProcess.once('exit', (code, signal) => {
      this.running = false
      this.exitCode = code
      this.exitSignal = signal
      this.countClose++

      if (code !== 0) {
        this.emit('processError', this)
      }
    })
  }

  /**
   * Restarts the process if it's not currently being killed. If the process is running or connected,
   * it will attempt to kill it before restarting.
   *
   * @async
   */
  async restart () {
    if (this.killing) {
      logger.warn(`Job killing! Waiting... Worker: "${this.worker.name}" Job: "${this.worker.job.name}"`)
      return
    }
    if (this.running || (this.childProcess && this.childProcess.connected)) {
      await this._killAndRun()
    } else {
      this.run()
    }
  }

  /**
   * Checks the health of the process. This method logs the current status of the process,
   * and restarts it if it is found to be hanging (not running).
   *
   */
  checkHealth () {
    // console.log('[WorkerManager]', )
    logger.debug(`Checking process ${this.id} Pid:#${this.childProcess?.pid} Running:${this.running} Connected:${this.childProcess?.connected}`)

    // Verifica se Job está parado
    if (this.running === false) {
      logger.error(`Process hangout: Worker: "${this.worker.name}" Job: "${this.worker.job.name}" Process: "${this.id}"}`)
      this.run()
    }

    // TODO: Verifica se Job está respondendo ping/pong (com timeout)

    // TODO: Veriica se job está conectado

    // TODO: Verifica consumo de memoria do Job

    // TODO: Verifica jobs está reiniciando muits vezes
  }

  /**
   * Private method to handle the process termination and subsequent restart.
   * It sequentially sends SIGINT, SIGTERM, and SIGKILL signals to the process with a pause
   * between each signal to allow for graceful termination.
   *
   * @async
   * @private
   */
  async _killAndRun () {
    this.killing = true

    logger.warn(`Killing job: "${this.worker.job.name}" Worker:"${this.worker.name}" ID: "${this.id}"`)

    const pidToKill = this.childProcess.pid

    // Prepares callback to restart the process when finished.
    this.childProcess.once('exit', async () => {
      logger.warn(`Killing successful: "${this.worker.job.name}" Worker:"${this.worker.name}" ID: "${this.id}" `)
      this.run()
      this.killing = false
    })

    // Send SIGNIT
    await this._sendKill('SIGINT')
    if (pidToKill !== this.childProcess.pid || !this.childProcess.connected) return

    await this._sendKill('SIGTERM')
    if (pidToKill !== this.childProcess.pid || !this.childProcess.connected) return

    await this._sendKill('SIGKILL')
    if (pidToKill !== this.childProcess.pid || !this.childProcess.connected) return

    logger.error(`Process is stuck. It cannot be killed. Restart aborted. Job: "${this.worker.job.name}" Worker:"${this.worker.name}" PID: "${this.childProcess.pid}"`)
    // TODO: Controle de zumbi
    this.killing = false
  }

  /**
   * Sends a specified kill signal to the child process and waits for a set period (defined by killWaitTime)
   * before returning to allow for potential process cleanup.
   *
   * @param {string} signal - The UNIX signal to send to the process (SIGINT, SIGTERM, or SIGKILL).
   * @async
   * @private
   */
  async _sendKill (signal) {
    logger.warn(`SEND KILL... PID: "${this.childProcess.pid}" SIGNAL: "${signal}"`)
    this.childProcess.kill(signal)
    await sleep(this.options.killWaitTime)
  }
}
