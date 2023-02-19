/**
 * **Created on 16/11/18**
 *
 * src/library/controller.js
 * @author André Timermann <andre.timermann@smarti.io>
 *
 *   Classe Abstrata que representa Controlador do MVC, aqui fica o ponto de entrada da nossa aplicação, desde execução de serviços, configuração de
 *   rotas, middleware (Para implementação de plugins) entre outros
 *
 * REF: Definindo classe abstrata - https://stackoverflow.com/questions/29480569/does-ecmascript-6-have-a-convention-for-abstract-classes
 *
 *
 * TODO: Documentar criar um diagrama de fluxo de execução igual do Vuejs
 * TODO: Verificar proxy para deixar alguns atributos readonly
 *
 */

import path from 'path'
import logger from '../logger.js'

import consolidate from 'consolidate'
import {performance} from 'perf_hooks'

const paths = {}

// TODO: Migrar para Atributo de Classe quando estiver compatível com PKG
export class Controller {
  constructor() {

    // Define classe como abastrata
    if (new.target === Controller) {
      throw new TypeError('Cannot construct Abstract instances directly')
    }

    /**
     * Nome da aplicação que este controller pertence
     * Definido em controllerController, não alterar
     *
     * @type {undefined}
     */
    this.applicationName = undefined

    /**
     * Nome da app que este controller pertence
     * Definido em controllerController, não alterar
     *
     * @type {string}
     */
    this.appName = undefined

    /**
     * None desde controller
     * Definido em controllerController, não alterar
     *
     * @type {string}
     */
    this.controllerName = undefined

    /**
     * Opções definida ao instanciar ou carregar aplicação
     * Definido em controllerController, não alterar
     *
     * @type {{}}
     */
    this.options = {}

    /**
     * Identificador unico da aplicação
     * Definido em controllerController, não alterar
     *
     * @type {string}
     */
    this.applicationId = undefined

    /**
     * Objeto Router Express
     * Definido em kernel, não alterar
     *
     * @type {{}}
     */
    this.router = undefined

    /**
     * Objeto com atributo das aplicações
     * Definido em kernel, não alterar
     *
     * @type {{}}
     */
    this.applications = undefined

    /**
     * Objeto Express
     * Definido em kernel, não alterar
     *
     * @type {{}}
     */
    this.app = undefined

    /**
     * Caminho físico desta App
     * Definido em controllerController, não alterar
     *
     * @type {string}
     */
    this.appPath = undefined

    /**
     * Caminho físico da aplicação onde esta app está
     * Definido em controllerController, não alterar
     *
     * @type {string}
     */
    this.applicationsPath = undefined

    /**
     * URL base padrão  para acesso a recursos estáticos.
     * Será usado pelo Helper @asset, que calcula automaticamente a url do recurso que será carregado na página
     *
     * Definido em kernel
     *
     * @type {string}
     */
    this.staticBaseUrl = undefined

    /**
     * Objeto socketServer, utilizado para comunicação socket
     * Undefined se modoCluster estiver desativado
     * Ref: https://socketcluster.io/#!/docs/api-scserver
     *
     * Definido em kernel, não alterar
     *
     * @type {SCServer}
     */
    this.socketServer = undefined

    /**
     * Objeto socketWorker, configurações avançada do socketCluster, para comunicação, utilizer socketServer
     * Undefined se modoCluster estiver desativado
     *
     * Ref: https://socketcluster.io/#!/docs/api-scworker
     *
     * Definido em kernel, não alterar
     *
     * @type {SCWorker}
     */
    this.socketWorker = undefined

    /**
     * Caminho Base da aplicação, ex: /api/v1/clients
     * Funciona como prefixo, não exigindo colocar rota completa sempre
     *
     * @type {string}
     */
    this.path = undefined
  }

  /// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Métodos Auxiliares para Criação de Rotas e API REST
  // Outros métodos podem ser acessodos utilizando this.app (objeto que refêrencia instancia express usada na aplicação)
  /// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  all(...args) {
    this.processRestMethod('all', ...args)
  }

  use(...args) {
    this.processRestMethod('use', ...args)
  }

  post(...args) {
    this.processRestMethod('post', ...args)
  }

  get(...args) {
    this.processRestMethod('get', ...args)
  }

  put(...args) {
    this.processRestMethod('put', ...args)
  }

  delete(...args) {
    this.processRestMethod('delete', ...args)
  }

  patch(...args) {
    this.processRestMethod('patch', ...args)
  }

  /**
   * Tratamento de erro padrão
   *
   * @param lastCallback  {callback}  Função que define API
   * @param request       {object}    Objeto Request do Express
   * @param response      {object}    Objeto Response do Express
   * @param args          {array}     restante dos argumentos do express, normalmente next e value
   *
   * @returns {Promise<void>}
   */
  async responseHandler(lastCallback, request, response, ...args) {
    try {
      await lastCallback(request, response, ...args)
    } catch (err) {
      const {status, errorInfo} = await this.errorHandler(err, request, response)
      response.status(status).json(errorInfo)
      console.error(err)
      logger.error(JSON.stringify({message: err.message, stack: err.stack}))
    }
  }

  /**
   * Tratamento padronizado de erros da API, pode ser estendido pelo usuário para padronizar ou selecionar erros que
   * serão exibidos
   *
   * @param err
   * @param request
   * @param response
   * @returns {Promise<{errorInfo: {error: boolean, message: *}, status: number}>}
   */
  async errorHandler(err, request, response) {
    return {
      status: 400,
      errorInfo: {
        error: true,
        message: err.message
      }
    }
  }

  /**
   * Intercepta métodos destinados ao Express (GET, POST, etc...) para tratar o retorno do usuário quando utilizando
   * Await/Async (Promise)
   *
   * @param httpMethod  {string}  Método HTTP que será tratado
   * @param args        {array}   Argumentos do método, callbacks definidos pelo usuário como middlware
   *
   * @returns {Promise<void>}
   */
  async processRestMethod(httpMethod, ...args) {
    // Obtém ultimo callback e modifica para tratar retornos
    const lastCallback = args.pop()

    if (typeof lastCallback === 'function') {
      // substitui ultimo callback por uma função que processa o ultimo callback (responseHandler)
      args.push(async (...args) => {
        const startTimeMeasure = performance.now()
        await this.responseHandler(lastCallback, ...args)
        this._logRequestInfo(startTimeMeasure, args)
      })
    } else {
      args.push(lastCallback)
    }

    const routePath = args[0]

    // Valida se o caminho já foi utilizado em outro controller, se args[0] não for string é um método sem path como
    // use
    if (typeof routePath === 'string') {
      this._validatePath(httpMethod, routePath)
    }

    // finalmente cria rota
    this.router[httpMethod](...args)
  }

  /**
   * Loga informações sobre a requisição como tempo de execução
   *
   * @param startTimeMeasure  {number}  Timestamp do inicio da execução desta requisição
   * @param args              {array}   Aregumentos enviado para responseHandler
   *
   * @private
   */
  _logRequestInfo(startTimeMeasure, args) {
    const durationMeasure = performance.now() - startTimeMeasure
    const [request, response] = args

    logger.info(`[REQUEST_INFO] ${request.method} ${request.url} ${response.statusCode} +${durationMeasure.toFixed(2)}ms`)
  }

  /// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Método Auxiliar para View (Template)
  /// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Renderiza um template usando a biblioteca Consolidate. (Usada pelo express internamente)
   *
   * Usanmos a bilioteca diretamente para ter mais controle sobre o diretório carregado
   *
   * Reference: https://github.com/tj/consolidate.js
   * Reference: http://handlebarsjs.com/
   *
   * @param templatePath    {string}  Template a ser carregado
   * @param locals  {object}  Váraveis disponíveis no template e configurações diversas
   * @param engine  {string}  Engine de template a ser renderizado
   *
   * @returns {Promise<void>}
   */
  async view(templatePath, locals = {}, engine = 'handlebars') {
    const viewPath = path.join(this.appPath, 'views', templatePath)
    return this._renderView(viewPath, locals, engine)
  }

  /**
   * Await Sleep
   *
   * @param ms  {int} Tempo de espera em milesegundos
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Permite Carregar View de outra aplicação/app
   *
   * @param applicationName {string}  Nome da aplicação
   * @param appName         {string}  Nome do app onde o template está
   * @param templatePath    {string}  Template a ser carregado
   * @param locals  {object}  Váraveis disponíveis no template e configurações diversas
   * @param engine  {string}  Engine de template a ser renderizado
   *
   *
   * @returns {Promise<void>}
   */
  async remoteView(applicationName, appName, templatePath, locals = {}, engine = 'handlebars') {
    if (!this.applicationsPath[applicationName]) {
      throw new Error(`Application '${applicationName}' not found. Available: (${Object.keys(this.applicationsPath)})`)
    }

    if (!this.applicationsPath[applicationName][appName]) {
      throw new Error(`App '${appName}' not found. Available: (${Object.keys(this.applicationsPath[applicationName])})`)
    }

    const viewPath = path.join(this.applicationsPath[applicationName][appName], 'views', templatePath)

    return this._renderView(viewPath, locals, engine)
  }

  /**
   * Renderiza uma View
   *
   * @param viewPath    {string}  Caminho da View
   * @param locals  {object}  Váraveis disponíveis no template e configurações diversas
   * @param engine  {string}  Engine de template a ser renderizado
   *
   * @returns {Promise<void>}
   * @private
   */
  async _renderView(viewPath, locals, engine) {
    const templateEngine = consolidate[engine]

    /// //////////////////////////////////////////////////////////////////////////////////////////////////////
    // Helpers para o template, são funcções que podem ser chamada no template para realizar determinada ação
    // Nota: Não é compatível com todos os templates (Atualmente handlerbars)
    /// //////////////////////////////////////////////////////////////////////////////////////////////////////
    locals.helpers = {

      /**
       * Retorna o caminho completo do  Asset passando apenas o nome do arquivo
       * Baseado no app atual.
       *
       * Ex: imagem.png é convertido para static/[ApplicationName]/[AppName]/imagem.png
       *
       *
       * @param args
       *
       * @returns {*|string|*}
       */
      '@asset': (...args) => {
        if (args.length === 2) {
          // (1) Argumento passado pelo usuario (assetPath)
          const [assetPath] = args
          return path.join(this.staticBaseUrl, this.applicationName, this.appName, assetPath)
        } else if (args.length === 3) {
          // (2) Argumentos passado pelo usuario (appName, assetPath)
          const [appName, assetPath] = args
          return path.join(this.staticBaseUrl, this.applicationName, appName, assetPath)
        } else if (args.length === 4) {
          // (3) Argumentos passado pelo usuario (applicationName, appName, assetPath)
          const [applicationName, appName, assetPath] = args
          return path.join(this.staticBaseUrl, applicationName, appName, assetPath)
        } else {
          throw new Error('Invalid number of arguments. Must be between 1 and 3')
        }
      }

    }

    return templateEngine(viewPath, locals)
  }

  /// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Métodos que podem ser estendidos e implementados na classe filha para Criação de Midleware, Serviços ou Rotas
  // Não deve ser chamado diretamente
  /// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Método abstrado para criação de Midleware Pré
   */
  async pre() {
    logger.debug('Middleware pre not implemented')
  }

  /**
   * Método abstrado para criação de Midleware Pós
   */
  async pos() {
    logger.debug('Middleware pos not implemented')
  }

  /**
   * Método abstrato Setup, utilizado para execução inicial
   */
  async setup() {
    logger.debug('Setup not implemented')
  }

  /**
   * Método Abstrado Router, usado para configurar Rotas
   */
  async route() {
    logger.debug('No route configured')
  }

  /**
   * Valida url definida
   *
   * @param method
   * @param methodPath
   * @private
   */
  _validatePath(method, methodPath) {
    if (typeof methodPath !== 'string') throw new TypeError(`path must be String! Type: ${typeof methodPath}`)

    const basePath = this.path
      ? this.path
      : ''

    logger.debug(`Validando Rota em ${this.appName}: ${method}: ${path.join(basePath, methodPath)}`)

    const h = [method, basePath, methodPath].toString()

    if (paths[h]) {
      throw new Error(`The route '${paths[h].method}: ${paths[h].path}', which is being defined in app '${this.appName}', has already been defined in the following app: '${paths[h].app}'`)
    } else {
      paths[h] = {
        method,
        path: path.join(basePath, methodPath),
        app: this.appName
      }
    }
  }
}


