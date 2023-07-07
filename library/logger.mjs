/**
 * **Created on 06/07/2023**
 *
 * https://stackoverflow.com/questions/56591967/winston-custom-transport-with-typescript
 * library/logger.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import { createLogger as winstonCreateLogger } from 'winston'
import Config from './config.mjs'
// import Transport from 'winston-transport'
import { Server } from 'socket.io'
import BlessedTransport from './winstonTransport/blessed.mjs'

import Console2Transport from './winstonTransport/console.mjs'

const transports = []

if (Config.get('logger.blessed.enabled')) {
  transports.push(new BlessedTransport())
}

if (Config.get('logger.console.enabled')) {
  transports.push(new Console2Transport())
}

if (transports.length === 0) {
  throw new Error('It is mandatory to define at least one transport in the logger (Winston Transport). To define the console transport as enabled in the logger, set the environment variable LOGGER_CONSOLE_ENABLED to true.')
}

const logger = winstonCreateLogger({ transports })

export default function createLogger (module) {
  return logger.child({ module })
}

/**
 * Inicia um servidor socket para monitorar log na web
 * TODO: Implementar socket
 */
export function socketServer () {
  console.log('NEW SOCKET SERVER')
  const io = new Server(4001, {
    // options
  })

  io.on('connection', (socket) => {
    console.log('NEW CONNECTION', socket)
  })
}
