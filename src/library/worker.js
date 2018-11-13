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

class Worker extends SCWorker {

  // Override the run function.
  // It will be executed when the worker is ready.
  // noinspection JSUnusedGlobalSymbols
  run() {

    // Inicializando Worker...
    // [Active] SocketCluster started
    // Version: 14.3.2
    // Environment: dev
    // WebSocket engine: ws
    // Port: 8000
    // Master PID: 2743
    // Worker count: 1
    // Broker count: 1

    console.log(`Inicializando Worker ${this.id} ${(this.isLeader) ? '(Leader)' : ''}...`)

    Kernel.run()

  }


}

new Worker()