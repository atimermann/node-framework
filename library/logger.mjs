// /**
//  * **Created on 13/11/18**
//  *
//  * src/library/logger.mjs
//  * @author André Timermann <andre@timermann.com.br>
//  *
//  *   Sistema de Log Pré-Configurado baseado no Winston com suporte GrayLog e Console
//  *
//  *   Para importar use a seguinte sintaxe:
//  *
//  *      const {logger} = require('./logger')
//  *
//  *      TODO: https://success.docker.com/article/logging-best-practices
//  *
//  */
// 'use strict'
//
// const { createLogger, format, transports } = require('winston')
// const Log2gelf = require('./winstonTransport/winston-graylog')
// const config = require('./config')
//
// const hrstart = process.hrtime()
// const start = hrstart[0] + (hrstart[1] / 1000000000)
//
// /// ///////////////////////////////////////////////////////////////////////////////////////////////
// // Transport
// /// ///////////////////////////////////////////////////////////////////////////////////////////////
// const transportsList = []
//
// /// ///////////////////
// // Console
// /// ///////////////////
//
// // TODO: BUG, transport Console, parece q é carregadfo por padrão, mesmo desativando está exibindo log no console - https://github.com/winstonjs/winston/issues/175
//
// const consoleEnabled = (process.env.LOGGER_CONSOLE_ENABLED !== undefined)
//   ? process.env.LOGGER_CONSOLE_ENABLED
//   : config.get('logger.console.enabled')
//
// if (consoleEnabled) {
//   transportsList.push(new transports.Console({
//     handleExceptions: config.get('logger.console.handleExceptions')
//   }))
// }
//
// /// ///////////////////
// // GrayLog
// /// ///////////////////
//
// /**
//  * Instancia log2gelf
//  */
// let log2gelf
//
// if (config.get('logger.graylog.enabled')) {
//   log2gelf = new Log2gelf({
//     host: config.get('logger.graylog.host'),
//     port: config.get('logger.graylog.port'),
//     handleExceptions: config.get('logger.graylog.handleExceptions'), // handle exception within Log2gelf
//     exitOnError: true, // exit after exception has been sent
//     exitDelay: 1000 // leave Log2gelf 1sec to send the message
//   })
//
//   transportsList.push(log2gelf)
// }
//
// /// ///////////////////////////////////////////////////////////////////////////////////////////////
// // Format
// /// ///////////////////////////////////////////////////////////////////////////////////////////////
//
// const myFormat = format.printf(info => {
//   const hrtime = process.hrtime()
//   const stop = hrtime[0] + hrtime[1] / 1000000000
//
//   /** eslint-disable-next-line - Eslint não suporte bitInt ainda, por estar no stage3 **/
//   let time = stop - start
//   time = Math.round(time * 1000) / 1000
//
//   return `[${info.timestamp}] [${time}] [${info.level}] ${info.message}`
// })
//
// /// ///////////////////////////////////////////////////////////////////////////////////////////////
// // Logger
// /// ///////////////////////////////////////////////////////////////////////////////////////////////
// const logger = createLogger({
//   // format: format.combine(format.timestamp(), myFormat),
//   transports: transportsList,
//   // level: config.get('logger.level'),
//   // silent: config.get('logger.silent')
// })
//
// module.exports = {
//   logger
// }

/**
 * **Created on 06/07/2023**
 *
 * library/logger.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import pino from 'pino'

const logger = pino({})

export default function createLogger (module) {
  return logger.child({ module })
}
