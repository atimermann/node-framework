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

import SocketIoTransport from './winstonTransport/socket.mjs'
import Console2Transport from './winstonTransport/console.mjs'

import { inspect } from 'node:util'

const logger = winstonCreateLogger({
  level: Config.get('logger.level')
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

// Socket
if (loggerConfig.socket?.enabled) {
  logger.add(new SocketIoTransport())
}

// Console
if (loggerConfig.console?.enabled) {
  logger.add(new Console2Transport())
}

export default function createLogger (module) {
  const childLogger = logger.child({ module })

  function parseMessage (message) {
    return typeof message === 'object' ? inspect(message) : message
  }

  function log (level, data) {
    childLogger[level](parseMessage(data))
  }

  return {
    info (data) {
      log('info', data)
    },
    debug (data) {
      log('debug', data)
    },
    warn (data) {
      log('warn', data)
    },
    error (data) {
      log('error', data)
    }
  }
}
