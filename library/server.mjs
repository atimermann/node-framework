/**
 * **Created on 20/09/18**
 *
 * src/library/server.js
 * @author André Timermann <andre.timermann@>
 *
 *   Servidor de execução do Sindri
 *
 */

import Application from './application.js'
import { logger } from './logger.js'
import Kernel from './kernel.mjs'

import { config as dotenvConfig } from 'dotenv'
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
      await Kernel.run(application.getApplicationData())
    } catch (error) {
      process.env.NODE_ENV === 'development' ? console.log(error) : logger.error(`${error.code}\n${error.stack}`)
      process.exit()
    }
  }
}
