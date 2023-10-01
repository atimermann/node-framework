/**
 * **Created on 06/07/2023**
 *
 * library/winstonTransport/socket.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 *   TODO: Não conecta no modo HTTP_SERVER
 *
 */

import Transport from 'winston-transport'
import Config from '../config.mjs'

const buffer = []
let SocketServer
let io
const namespace = Config.get('logger.socket.namespace')

export default class SocketIoTransport extends Transport {
  constructor (opts) {
    super(opts)
    this.name = 'SocketTransport'
  }

  async handleSocketConnection () {
    /*
    O SocketServer deve ser importado de maneira dinâmica, pois a classe SocketServer também faz a importação do
    logger. Se essas importações forem feitas de maneira estática, pode ocorrer uma dependência circular,
    que poderia levar a um comportamento indefinido ou erros de tempo de execução.
    */
    if (!SocketServer) {
      SocketServer = (await import('../socket-server.mjs')).default
    }

    if (!SocketServer.io) {
      return false
    }

    if (!io) {
      io = SocketServer.io

      const namespaceSockets = SocketServer.io.of(namespace)
      namespaceSockets.on('connection', (socket) => {
        // console.log(`Novo usuário conectado ao namespace ${namespace}, socket ID: ${socket.id}`)
        // Flush buffer for this user
        while (buffer.length) {
          namespaceSockets.emit('log', buffer.shift())
        }
      })
    }

    return true
  }

  async log (logObj, callback) {
    // Adiciona o logObj ao buffer, pois ele será processado abaixo
    buffer.push(logObj)

    if (!await this.handleSocketConnection()) {
      callback()
      return
    }

    const namespaceSockets = SocketServer.io.of(namespace)
    const numberOfClients = namespaceSockets.sockets.size

    if (numberOfClients === 0) {
      callback()
      return
    }

    // Envia todos os logs do buffer enquanto houver clientes conectados
    while (buffer.length) {
      namespaceSockets.emit('log', buffer.shift())
    }

    callback()
  }
}
