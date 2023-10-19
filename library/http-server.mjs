/**
 * **Created on 13/11/18**
 *
 * src/library/kernel.js
 * @author André Timermann <andre@timermann.com.br>
 *
 *   The Framework HTTP Server, where the server is configured and initialized.
 *   Initializes Expressjs, applications and on the server
 *
 *   More modules for Express: https://github.com/expressjs
 *
 *  Before changing, read about Security:
 *  https://expressjs.com/en/advanced/best-practice-security.html
 *
 *  @typedef {import('./application.mjs').default} Application
 *
 */

import express from 'express'
import bodyParser from 'body-parser'
import morgan from 'morgan'
import helmet from 'helmet'
import compression from 'compression'
import { Writable } from 'stream'
import { join } from 'path'

import { createServer } from 'http'

import cors from 'cors'
import Config from './config.mjs'
import SocketServer from './socket-server.mjs'
import fs from 'node:fs'

import createLogger from './logger.mjs'

const logger = createLogger('Http Server')

const HTTPS_ENABLED = Config.get('httpServer.https.enabled')

export default {

  /**
   * Initializes the server
   *
   * @param application {Application}    Instance of application
   *
   */
  async run (application) {
    // TODO: Verificar pra q serve global.__BASE = join(application.path, '/')

    logger.info('Initializing HTTP Server...')

    if (process.env.NODE_ENV === undefined) throw new Error('Environment is not defined, create an .env file with attribute NODE_ENV.')

    // Deserializa informações da aplicação
    // let application = JSON.parse(serializedApplication)

    let httpServer

    if (HTTPS_ENABLED) {
      let https
      try {
        https = await import('node:https')
      } catch (err) {
        console.error('https support is disabled!')
      }

      // Estender se necessário:
      // - https://nodejs.org/docs/latest-v18.x/api/tls.html#tlscreatesecurecontextoptions
      //  - https://nodejs.org/docs/latest-v18.x/api/tls.html#tlscreateserveroptions-secureconnectionlistener
      httpServer = https.createServer({
        key: fs.readFileSync(Config.get('httpServer.https.key')),
        cert: fs.readFileSync(Config.get('httpServer.https.cert'))
      })

      // TODO: Criar fallback para porta 80 redirecionar para porta https, vai ter q subir dois servidores
    } else {
      httpServer = createServer()
    }

    /**
     * Route for accessing static resources (e.g., jpeg, html, js etc...)
     * Default is /static
     *
     * @type {string}
     */
    this.staticRoute = Config.get('httpServer.staticRoute')

    /**
     *
     * @type {*}
     */
    this.staticPath = Config.get('httpServer.staticPath')

    /**
     * Enables access to static resources via CDN (if true, it disables Express static file server)
     * If the CDN environment variable is not set, the value is fetched from configuration.
     *
     * @type {boolean}
     */
    this.cdn = (process.env.CDN === undefined)
      ? Config.get('httpServer.cdn')
      : process.env.CDN

    /**
     * The port on which the HTTP server will listen for incoming requests.
     * The value is fetched from the configuration.
     *
     * @type {number}
     */
    this.port = Config.get('httpServer.port')

    /**
     * The hostname or IP address on which the HTTP server will listen.
     * It determines the network interface where the server will be accessible.
     * The value is fetched from the configuration.
     *
     * @type {string}
     */
    this.hostname = Config.get('httpServer.hostname')

    /**
     * Base URL of the CDN Server
     * If the CDN_URL environment variable is not set, the value is fetched from configuration.
     *
     * @type {string}
     */
    this.cdnUrl = process.env.CDN_URL || Config.get('httpServer.cdnUrl')

    // Configura ExpressJs
    const app = this._configureExpressHttpServer(httpServer, application)

    // Carrega Aplicações
    await this._loadApplications(app, application)

    // Inicializa Servidor HTTP
    this._startHttpServer(httpServer)

    logger.info('==============================================================')
    logger.info(`Hostname:         ${this.hostname}`)
    logger.info(`Port:             ${this.port}`)
    logger.info(`Https (SSL):      ${HTTPS_ENABLED}`)
    logger.info(`Static route:     http://${this.hostname}${this.port === 80 ? `:${this.port}` : ''}${this.staticRoute}`)
    logger.info(`Static root path: ${join(process.cwd(), this.staticPath)}`)
    logger.info('==============================================================')
  },

  /**
   * Configures the Express server
   *
   * Note: We do not use express view engine, but an external one implemented in the controller
   *
   * @param httpServer  {Object}  HTTP object (Nodejs)
   * @param application {Application}  Information about the application being loaded
   *
   * @returns {Object}  Express object
   * @private
   */
  _configureExpressHttpServer (httpServer, application) {
    const app = express()

    httpServer.on('request', app)
    SocketServer.configureExpressHttpServer(httpServer)

    /// /////////////////////////////////////////////////
    // Regista log de acesso no express
    // Deve ser registrado antes dos demais middleware para registrar todos os logs
    /// /////////////////////////////////////////////////
    app.use(
      morgan(
        Config.get('httpServer.log.format'),
        {

          stream: new Writable({
            write (chunk, encoding, callback) {
              logger.info('[HTTP] ' + chunk.toString('utf8', 0, chunk.length - 1))
              callback()
            }
          })
        }
      )
    )

    /// /////////////////////////////////////////////////
    // Segurança
    // Ref: https://helmetjs.github.io/
    /// /////////////////////////////////////////////////
    app.use(helmet(Config.getYaml('httpServer.helmet')))

    /// /////////////////////////////////////////////////
    // Cors
    // TODO: Parametrizar: https://expressjs.com/en/resources/middleware/cors.html#installation
    /// /////////////////////////////////////////////////
    app.use(cors())

    // TODO: Necessário habilitar http fallback
    // // Middleware para redirecionamento de HTTP para HTTPS
    // function ensureSecure (req, res, next) {
    //   if (req.secure) {
    //     console.log('NÃO REDIRECIONANDO =========================================================================================================')
    //     // Requisição já é HTTPS, não precisa de redirecionamento
    //     return next()
    //   }
    //
    //   console.log('REDIRECIONANDO =========================================================================================================')
    //
    //   // Redireciona para a versão HTTPS da mesma URL
    //   res.redirect('https://' + req.hostname + req.url)
    // }
    //
    // // Adicione o middleware de redirecionamento antes de outras rotas
    // if (HTTPS_ENABLED) {
    //   app.use(ensureSecure)
    // }

    /// /////////////////////////////////////////////////
    // TODO: Parametrizar possibilidade de usar CDN ou servidor separado
    // Arquivos Estático
    /// /////////////////////////////////////////////////

    if (!this.cdn) {
      // ref: https://github.com/zeit/pkg#snapshot-filesystem
      let sourceStaticFiles

      if (Config.get('httpServer.loadStaticFromPackage')) {
        sourceStaticFiles = join(application.path, this.staticPath)
        logger.info(`Carregando arquivos estáticos do pacote (${sourceStaticFiles})`)
      } else {
        sourceStaticFiles = join(application.path, this.staticPath)
        logger.info(`Loading static route: "${this.staticRoute}" path "${sourceStaticFiles}"`)
      }

      app.use(this.staticRoute, express.static(sourceStaticFiles))
    }

    const customStaticRoutes = Config.getYaml('httpServer.customStaticRoutes', 'array')

    if (customStaticRoutes) {
      for (const customStaticRoute of customStaticRoutes) {
        const sourceStaticFiles = join(application.path, customStaticRoute.staticPath)
        logger.info(`Loading custom static route: "${customStaticRoute.staticRoute}" path "${sourceStaticFiles}'`)
        app.use(customStaticRoute.staticRoute, express.static(sourceStaticFiles))
      }
    }

    /// /////////////////////////////////////////////////
    // BodyParser
    // Ref: https://github.com/expressjs/body-parser
    /// /////////////////////////////////////////////////
    app.use(bodyParser.urlencoded({
      extended: false,
      limit: Config.get('httpServer.urlenconded.limit')
    }))

    // Configurar Json
    app.use(bodyParser.json({
      limit: Config.get('httpServer.json.limit')
    }))

    /// /////////////////////////////////////////////////
    // Compressão
    /// /////////////////////////////////////////////////
    app.use(compression())

    return app
  },

  /**
   * Loads Applications
   *
   * @param app         {Object}    Expressjs object
   * @param application {Application}    Information about the Application
   *
   * @private
   */
  async _loadApplications (app, application) {
    const controllers = []

    /**
     * Arvore de caminho das aplicações
     *
     * @type {{}}
     */
    const applicationPathTree = {}

    /// ///////////////////////////////////////////////////////////////////////////
    // Carrega Controllers
    /// ///////////////////////////////////////////////////////////////////////////
    for (const controller of application.getControllers()) {
      /// //////////////////////////////////////////
      // Instancia do Expressjs
      /// //////////////////////////////////////////
      controller.app = app

      /// //////////////////////////////////////////
      // Cria Rota Especifica para este controlador
      /// //////////////////////////////////////////
      controller.router = express.Router({
        strict: true
      })

      // Extrai Path e cria arvore
      if (applicationPathTree[controller.applicationName] === undefined) {
        applicationPathTree[controller.applicationName] = {}
      }

      applicationPathTree[controller.applicationName][controller.appName] = controller.appPath

      /// //////////////////////////////////////////
      // Static / CDN
      /// //////////////////////////////////////////

      if (this.cdn) {
        controller.staticBaseUrl = this.cdnUrl
      } else {
        controller.staticBaseUrl = this.staticRoute
      }

      /// //////////////////////////////////////////
      // Adiciona na Lista de controllers
      /// //////////////////////////////////////////
      controllers.push(controller)
    }

    for (const controller of controllers) {
      controller.applicationsPath = applicationPathTree
    }

    /// ///////////////////////////////////////////////////////////////////////////////////
    // middleware - PRÉ
    /// ///////////////////////////////////////////////////////////////////////////////////

    for (const controller of controllers) {
      await controller.pre()
    }

    for (const controller of controllers) {
      await controller.setup()
    }

    /// ///////////////////////////////////////////////////////////////////////////////////
    // Controller
    /// ///////////////////////////////////////////////////////////////////////////////////

    for (const controller of controllers) {
      // Configura Rotas
      await controller.routes()

      // Retorna e define Rota Configurada pelo controller
      controller.path
        ? app.use(controller.path, controller.router)
        : app.use(controller.router)
    }

    /// ///////////////////////////////////////////////////////////////////////////////////
    // middleware - PÓS
    /// ///////////////////////////////////////////////////////////////////////////////////
    for (const controller of controllers) {
      await controller.pos()
    }

    logger.debug('Applications Loaded!')
  },

  /**
   * Initializes HTTP server
   *
   * @param httpServer
   */
  _startHttpServer (httpServer) {
    logger.info('Initializing HTTP_SERVER...')

    httpServer.listen(this.port, this.hostname, () => {
      logger.info('--------------------------------------------------------------')
      logger.info('Address: ' + httpServer.address().address)
      logger.info('Port:    ' + httpServer.address().port)
      logger.info('Family:  ' + httpServer.address().family)
      logger.info('--------------------------------------------------------------')
      Config.get('httpServer.https.enabled')
        ? logger.info('Https server started!')
        : logger.info('Https server started!')
    })
  }

}
