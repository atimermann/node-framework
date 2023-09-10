/**
 * Created on 27/07/23
 *
 * /socket
 * @author André Timermann <andre@timermann.com.br>
 * TODO:
 *  - Abstrair middlesares? ?? https://socket.io/docs/v4/middlewares/
 *  - Gerenciamento de erro
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
import chalk from 'chalk'

import createLogger from './logger.mjs'
const logger = createLogger('Socket')

/**
 * Class representing a Socket Server
 * @class
 */
export default class SocketServer {
  /**
   * The mode of the socket server. Determines the type of server to create (e.g., standalone, standalone-http, etc.).
   * Loaded from the configuration file.
   *
   * @type {string}
   * @static
   */
  static mode

  /**
   * The port number on which the socket server will run. Loaded from the configuration file.
   *
   * @type {number}
   * @static
   */
  static port

  /**
   * The SSL key pair for the server, used when creating an HTTPS or HTTP2 server. Loaded from the configuration file.
   * Contains paths to the key and certificate files.
   *
   * @type {Object}
   * @static
   */
  static keys

  /**
   * Holds the instance of the Socket.io server.
   *
   * @type {import("socket.io").Server}
   */
  static io

  /**
   * Runs the Socket Server based on the configuration mode
   * @static
   * @throws {Error} When an invalid socket mode is provided
   */
  static run (application) {
    logger.info('Initializing Socket Server...')

    this._loadConfiguration()

    logger.info('==============================================================')
    logger.info(`Mode:      ${this.mode}`)
    logger.info(`Port:      ${this.mode === 'http-server' ? Config.get('httpServer.port') : this.port}`)
    logger.info(`Cors:      ${JSON.stringify(this._getOptions().cors)}`)
    logger.info(`Transport: ${this._getOptions().transports}`)
    logger.debug('Options:')
    logger.debug(this._getOptions())
    logger.info('==============================================================')

    // NOTE: In http-server mode, the server setup is initiated in the http-server module and called in
    //   configureExpressHttpServer
    switch (this.mode) {
      case 'http-server':
        if (!this.io) throw new Error('In this mode Http server must be initialized before starting Socket Server.')
        break
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

    this.io.on('connection', socket => {
      logger.info(`${chalk.bold('New connection:')} ID: "${socket.id}" Path: "${socket.nsp.name}"`)

      socket.on('disconnect', (reason) => {
        logger.info(`${chalk.bold('Disconnection: ID:')} "${socket.id}" Path: "${socket.nsp.name}" Reason: "${reason}"`)
      })
    })

    this._loadApplications(application)

    logger.info('Socket Server started.')
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
   * Loads Applications
   * @param application {Application}    Information about the Application
   *
   * @private
   */
  static _loadApplications (application) {
    for (const controller of application.getControllers()) {
      controller.io = this.io
      controller.socket()

      logger.info('Socket applications loaded!')
      logger.debug(`Controller loaded: "${controller.applicationName}/${controller.appName}/${controller.controllerName}"`)
    }
  }

  /**
   * Configures an existing Express HTTP Server for use with socket.io
   * @static
   * @param {Object} httpServer - The HTTP server instance to configure.
   */
  static configureExpressHttpServer (httpServer) {
    if (Config.get('socket.enabled', 'boolean') && Config.get('socket.mode') === 'http-server') {
      this.io = new Server(httpServer, this._getOptions())
    }
  }

  /**
   * Creates a standalone Socket Server
   * @private
   * @static
   * @returns {Server} - The newly created Socket Server
   */
  static _createStandaloneServer () {
    return new Server(this.port, this._getOptions())
  }

  /**
   * Creates a standalone HTTP Socket Server
   * @private
   * @static
   * @returns {Server} - The newly created Socket Server
   */
  static _createStandaloneHttpServer () {
    const httpServer = createServer()
    const io = new Server(httpServer, this._getOptions())
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
    const io = new Server(httpsServer, this._getOptions())
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
    const io = new Server(httpsServer, this._getOptions())
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

  /**
   * Genreate Socket config options
   *
   * @returns {Object}
   * @private
   */
  static _getOptions () {
    return {
      ...Config.get('socket.options'),
      cors: Config.get('socket.cors'),
      transports: Config.get('socket.transports')
    }
  }
}
