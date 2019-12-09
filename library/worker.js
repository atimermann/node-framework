/**
 * **Created on 13/11/18**
 *
 * src/library/worker.js
 * @author André Timermann <andre.timermann@smarti.io>
 *
 *   EntryPoint para a aplicação no SocketCluster
 *
 */
'use strict'

const SCWorker = require('socketcluster/scworker')
const Kernel = require('./kernel')
const { logger, updateClusterInfo } = require('./logger')

class Worker extends SCWorker {
  // Override the run function.
  // It will be executed when the worker is ready.
  // noinspection JSUnusedGlobalSymbols
  run () {
    // Inicializando Worker...
    // [Active] SocketCluster started
    // Version: 14.3.2
    // Environment: dev
    // WebSocket engine: ws
    // Port: 8000
    // Master PID: 2743
    // Worker count: 1
    // Broker count: 1

    try {
      updateClusterInfo(this.id, this.isLeader)

      logger.info(`Inicializando Worker ${this.id} ${(this.isLeader) ? '(Leader)' : ''}...`)

      Kernel.run(this.options.application, this)
    } catch (error) {
      logger.error(error.stack)
      process.exit()
    }
  }
}

const workr = new Worker()

workr.on('error', err => {
  logger.error(err.message)
})

workr.on('notice', message => {
  logger.warn(message)
})

workr.on('exit', message => {
  logger.error(message)
})

workr.on('ready', message => {
  logger.info('Worker is ready to accept requests from users')
})
