/**
 * **Created on 27/01/2023**
 *
 * index.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import Application from './library/application.mjs'
import ApplicationController from './library/application-controller.mjs'
import Server from './library/server.mjs'
import config from './library/config.js'
import createLogger from './library/logger.mjs'

const logger = createLogger()

export * from './library/controller.mjs'

export { Application, Server, createLogger, logger, config, ApplicationController }
