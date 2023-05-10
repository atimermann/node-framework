/**
 * **Created on 20/09/18**
 *
 * src/library/server.js
 * @author André Timermann <andre.timermann@>
 *
 *   Servidor de execução do Sindri
 *
 */
'use strict'

const Application = require('./application')
const { logger } = require('./logger')
const Kernel = require('./kernel')

require('dotenv').config()

module.exports = {

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
