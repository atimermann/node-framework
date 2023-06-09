/**
 * **Created on 20/09/18**
 *
 * src/library/server.js
 * @author André Timermann <andre@timermann.com.br>
 *
 *   Servidor de execução do Sindri
 *
 */

import Application from './application.js'
import { logger } from './logger.js'
import HttpServer from './http-server.mjs'

import { config as dotenvConfig } from 'dotenv'
import JobManager from './job-manager.mjs'

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

      if (process.argv[2] === 'job') {
        await this.runJob(application)
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
  },

  async runJob (application) {
    await JobManager.runWorker(application)
  }
}
