/**
 * **Created on 06/07/2023**
 *
 * library/winstonTransport/socket.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import Transport from 'winston-transport'

export default class SocketIoTransport extends Transport {
  constructor (opts) {
    super(opts)
    this.name = 'SocketTransport'
  }

  log (logObj, callback) {
    console.log(logObj)
    callback()
  }
}
// class SocketIoTransport extends Transport {
//   constructor (opts) {
//     super(opts)
//     this.name = 'socketIoTransport'
//   }
//
//   log (info, callback) {
//     console.log(info)
//     // setImmediate(() => this.emit('logged', info))
//     // io.emit('log', JSON.stringify(info))
//     callback()
//   }
// }
