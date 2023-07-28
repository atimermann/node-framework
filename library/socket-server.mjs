/**
 * Created on 27/07/23
 *
 * /socket
 * @author André Timermann <andre@timermann.com.br>
 * TODO:
 *  - Documentar (Documentar lado cliente tb)
 *  - Gerenciar conexão, portas, iniciar novo servidor
 *  - Disponibilizar IO para usuario
 *  - Gerenciar e configurar CORS
 *  - Utilizar namespace igual this.get, usar this.namespace('/abc')
 *  - Opção padrão de comunicação com websocket em vez de requisição(que parece ser padrão) testar performance
 *  - Segurança: Autenticação
 *  - https://socket.io/docs/v4/middlewares/
 *  - Gerenciamento de erro
 *  - TODO: Implementar Options
 *  https://www.youtube.com/watch?v=0RMYomgf4a8
 *
 * Todas as opções disponivel para serem analisada e implentada: https://socket.io/docs/v4/server-options/
 *
 */

import { createServer } from 'http'
import { readFileSync } from 'fs'
import { createServer as createHttpsServer } from 'https'
import { createSecureServer } from 'http2'
import { Server } from 'socket.io'
import Config from './config.mjs'

import createLogger from './logger.mjs'

const logger = createLogger('Socket')

/**
 * Class representing a Socket Server
 * @class
 */
export default class SocketServer {
  static mode = null
  static port = null
  static keys = null

  /**
   * Runs the Socket Server based on the configuration mode
   * @static
   * @throws {Error} When an invalid socket mode is provided
   */
  static run () {
    logger.info('Initializing Socket Server...')

    this._loadConfiguration()

    logger.info('==============================================================')
    logger.info(`Mode:  ${this.mode}`)
    logger.info(`Port:  ${this.mode === 'http-server' ? Config.get('httpServer.port') : this.port}`)
    logger.info('==============================================================')

    // NOTE: In http-server mode, the server setup is initiated in the http-server module and called in
    //   configureExpressHttpServer
    switch (this.mode) {
      case 'standalone':
        this.io = this._createStandaloneServer()
        break
      case 'standalone-http':
        this.io = this._createStandaloneHttpServer()
        break
      case 'standalone-https':
        this.io = this._createStandaloneHttpsServer()
        break
      case 'standalone-http2':
        this.io = this._createStandaloneHttp2Server()
        break
      default:
        throw new Error(`Invalid socket mode: ${this.mode}`)
    }

    this.io.on('connection', (socket) => {
      logger.info(socket)
      logger.info('New connection')
    })

    logger.info('Socket Server started.')
  }

  /**
   * Configures an existing Express HTTP Server for use with socket.io
   * @static
   * @param {Object} httpServer - The HTTP server instance to configure.
   */
  static configureExpressHttpServer (httpServer) {
    this.io = new Server(httpServer, { /* options */})
  }

  /**
   * Loads the configuration for the Socket Server from the Config module.
   * This method should be called before creating the server.
   * The configuration includes the server mode, port, and SSL key pair.
   * @private
   * @static
   */
  static _loadConfiguration () {
    this.mode = Config.get('socket.mode')
    this.port = Config.get('socket.port')
    this.keys = Config.get('socket.keys')
  }

  /**
   * Creates a standalone Socket Server
   * @private
   * @static
   * @returns {Server} - The newly created Socket Server
   */
  static _createStandaloneServer () {
    return new Server(this.port, { /* options */})
  }

  /**
   * Creates a standalone HTTP Socket Server
   * @private
   * @static
   * @returns {Server} - The newly created Socket Server
   */
  static _createStandaloneHttpServer () {
    const httpServer = createServer()
    const io = new Server(httpServer, { /* options */})
    httpServer.listen(this.port)
    return io
  }

  /**
   * Creates a standalone HTTPS Socket Server
   * @private
   * @static
   * @returns {Server} - The newly created Socket Server
   */
  static _createStandaloneHttpsServer () {
    const httpsServer = createHttpsServer(this._getHttpsOptions())
    const io = new Server(httpsServer, { /* options */})
    httpsServer.listen(this.port)
    return io
  }

  /**
   * Creates a standalone HTTP2 Socket Server
   * @private
   * @static
   * @returns {Server} - The newly created Socket Server
   */
  static _createStandaloneHttp2Server () {
    const httpsServer = createSecureServer({ allowHTTP1: true, ...this._getHttpsOptions() })
    const io = new Server(httpsServer, { /* options */})
    httpsServer.listen(this.port)
    return io
  }

  /**
   * Gets HTTPS options for creating a secure server
   * @private
   * @static
   * @returns {Object} - An object containing the key and cert for HTTPS
   */
  static _getHttpsOptions () {
    return {
      key: readFileSync(this.keys.key), cert: readFileSync(this.keys.cert)
    }
  }
}
