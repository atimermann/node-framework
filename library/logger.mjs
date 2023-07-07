/**
 * **Created on 06/07/2023**
 *
 * https://stackoverflow.com/questions/56591967/winston-custom-transport-with-typescript
 * library/logger.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import { createLogger as winstonCreateLogger } from 'winston'
// import Transport from 'winston-transport'
import { Server } from 'socket.io'
import BlessedTransport from './winstonTransport/blessed.mjs'

import Console2Transport from './winstonTransport/console.mjs'

const logger = winstonCreateLogger({
  transports: [
    // new SocketIoTransport()
    new Console2Transport()
    // new BlessedTransport()
  ]
})

export default function createLogger (module) {
  return logger.child({ module })
}

/**
 * Inicia um servidor socket para monitorar log na web
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
