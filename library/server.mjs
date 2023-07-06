/**
 * **Created on 20/09/18**
 *
 * src/library/server.js
 * @author André Timermann <andre@timermann.com.br>
 *
 *   Servidor de execução do Sindri
 *
 */

import { config as dotenvConfig } from 'dotenv'
import Application from './application.mjs'
import { logger } from './logger.js'
import HttpServer from './http-server.mjs'

import JobManager from './jobs/job-manager.mjs'
import JobWorker from './jobs/job-worker.mjs'

dotenvConfig()

export default {

  /**
   * Inicializa Servidor
   *
   * @param application {Application}
   */
  async init (application) {
    try {
      if (!(application instanceof Application)) {
        // noinspection ExceptionCaughtLocallyJS
        throw new TypeError('application must be instance of Application')
      }

      await application.init()

      if (process.argv[2] === 'job') {
        await JobWorker.run(application)
      } else {
        await this.initServer(application)
      }
    } catch (error) {
      process.env.NODE_ENV === 'development' ? console.log(error) : logger.error(`${error.code}\n${error.stack}`)
      process.exit()
    }
  },

  async initServer (application) {
    await Promise.all([
      HttpServer.run(application),
      JobManager.run(application)
    ])
  }
}
