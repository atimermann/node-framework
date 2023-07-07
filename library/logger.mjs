/**
 * **Created on 06/07/2023**
 *
 * https://stackoverflow.com/questions/56591967/winston-custom-transport-with-typescript
 * library/logger.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import { createLogger as winstonCreateLogger, transports, format } from 'winston'
import Config from './config.mjs'
// import Transport from 'winston-transport'
// import { Server } from 'socket.io'
import BlessedTransport from './winstonTransport/blessed.mjs'

import Console2Transport from './winstonTransport/console.mjs'

// /**
//  * Inicia um servidor socket para monitorar log na web
//  * TODO: Implementar socket
//  */
// export function socketServer () {
//   console.log('NEW SOCKET SERVER')
//   const io = new Server(4001, {
//     // options
//   })
//
//   io.on('connection', (socket) => {
//     console.log('NEW CONNECTION', socket)
//   })
// }

const logger = winstonCreateLogger({
  level: 'info'
})

const loggerConfig = process.argv[2] === 'job'
  ? Config.get('jobManager.logger')
  : Config.get('logger')

// JSON
if (loggerConfig.json?.enabled) {
  logger.add(new transports.Console({
    format: format.json()
  }))
}

// BLESSED
if (loggerConfig.blessed?.enabled) {
  logger.add(new BlessedTransport())
}

// CONSOLE
if (loggerConfig.console?.enabled) {
  logger.add(new Console2Transport())
}

export default function createLogger (module) {
  return logger.child({ module })
}
