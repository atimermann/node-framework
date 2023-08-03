/**
 * **Created on 06/07/2023**
 *
 * library/winstonTransport/socket.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import Transport from 'winston-transport'
import Config from '../config.mjs'

export default class SocketIoTransport extends Transport {
  constructor (opts) {
    super(opts)
    this.name = 'SocketTransport'
  }

  async log (logObj, callback) {
    /*
    O SocketServer deve ser importado de maneira dinâmica, pois a classe SocketServer também faz a importação do
    logger. Se essas importações forem feitas de maneira estática, pode ocorrer uma dependência circular,
    que poderia levar a um comportamento indefinido ou erros de tempo de execução.
    */
    const SocketServer = (await import('../socket-server.mjs')).default

    // só envia logs quando socket server estiver pronto, caso contrário ignora
    if (SocketServer.io) {
      SocketServer.io.of(Config.get('logger.socket.namespace')).emit('log', logObj)
    }

    callback()
  }
}
