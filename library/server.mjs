/**
 * **Created on 09/20/18**
 *
 * src/library/server.js
 * @author André Timermann <andre@timermann.com.br>
 *
 *   Bootstrap, server execution
 *
 */

import Application from './application.mjs'
import HttpServer from './http-server.mjs'
import SocketServer from './socket-server.mjs'

import JobManager from './jobs/job-manager.mjs'
import WorkerRunner from './jobs/worker-runner.mjs'

import BlessedInterface from './blessed.mjs'
import Config from './config.mjs'

export default {

  /**
   * Initializes Server
   *
   * @param {Application} application
   */
  async init (application) {
    try {
      if (!(application instanceof Application)) {
        // noinspection ExceptionCaughtLocallyJS
        throw new TypeError('application must be instance of Application')
      }

      await application.init()

      if (process.argv[2] === 'job') {
        if (Config.get('jobManager.enabled', 'boolean')) {
          await WorkerRunner.run(application)
        } else {
          throw new Error('jobManager disabled')
        }
      } else {
        await this.initServer(application)
      }
    } catch (error) {
      console.error(error)
      process.exit()
    }
  },

  /**
   * Initializes Server
   *
   * @param {Application} application
   */
  async initServer (application) {
    if (Config.get('blessed.enabled', 'boolean')) {
      BlessedInterface.init()
    }

    await Promise.all([
      Config.get('httpServer.enabled', 'boolean') ? HttpServer.run(application) : null,
      Config.get('jobManager.enabled', 'boolean') ? JobManager.run(application) : null,
      Config.get('socket.enabled', 'boolean') ? SocketServer.run(application) : null
    ])
  }
}
