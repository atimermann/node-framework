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
'use strict'

const path = require('path')
const {logger} = require('./logger')
const {isString} = require('lodash')
const consolidate = require('consolidate')

let paths = {}

class Controller {

  constructor() {

    console.log('Instanciando Controller')

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

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Métodos Auxiliares para Criação de Rotas e API REST
  // Outros métodos podem ser acessodos utilizando this.app (objeto que refêrencia instancia express usada na aplicação)
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  all() {
    this._validate('ALL', arguments[0])
    this.router.all.apply(this.router, arguments)
  }

  use() {
    logger.debug('USE:', isString(arguments[0]) ? arguments[0] : '')
    this.router.use.apply(this.router, arguments)
  }

  post() {
    this._validate('POST', arguments[0])
    this.router.post.apply(this.router, arguments)
  }

  get() {
    this._validate('GET', arguments[0])
    this.router.get.apply(this.router, arguments)
  }

  put() {
    this._validate('PUT', arguments[0])
    this.router.put.apply(this.router, arguments)
  }

  delete() {
    this._validate('DELETE', arguments[0])
    this.router.delete.apply(this.router, arguments)
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Método Auxiliar para View (Template)
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

    let viewPath = path.join(this.appPath, 'views', templatePath)
    return await this._renderView(viewPath, locals, engine)

  }

  /**
   * Await Sleep
   * @param ms
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

    let viewPath = path.join(this.applicationsPath[applicationName][appName], 'views', templatePath)

    return await this._renderView(viewPath, locals, engine)

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

    let templateEngine = consolidate[engine]

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Helpers para o template, são funcções que podem ser chamada no template para realizar determinada ação
    // Nota: Não é compatível com todos os templates (Atualmente handlerbars)
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    locals['helpers'] = {

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

        ///////////////////////////////////////////////////////
        // (1) Argumento passado pelo usuario (assetPath)
        ///////////////////////////////////////////////////////
        if (args.length === 2) {

          let [assetPath,] = args
          return path.join(this.staticBaseUrl, this.applicationName, this.appName, assetPath)
        }

        ///////////////////////////////////////////////////////
        // (2) Argumentos passado pelo usuario (appName, assetPath)
        ///////////////////////////////////////////////////////
        else if (args.length === 3) {

          let [appName, assetPath] = args
          return path.join(this.staticBaseUrl, this.applicationName, appName, assetPath)

        }

        ///////////////////////////////////////////////////////
        // (3) Argumentos passado pelo usuario (applicationName, appName, assetPath)
        ///////////////////////////////////////////////////////
        else if (args.length === 4) {

          let [applicationName, appName, assetPath] = args
          return path.join(this.staticBaseUrl, applicationName, appName, assetPath)

        } else {

          throw new Error('Invalid number of arguments. Must be between 1 and 3')
        }

      }

    }

    return await templateEngine(viewPath, locals)

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Métodos que podem ser estendidos e implementados na classe filha para Criação de Midleware, Serviços ou Rotas
  // Não deve ser chamado diretamente
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
   * Valida Path
   *
   * @param method
   * @param path
   * @private
   */
  _validate(method, path) {

    if (!isString(path)) throw new TypeError('path must be String!')

    logger.debug(method + ':', path)

    let h = [method, path].toString()

    if (paths[h]) {
      throw new Error(`The route '${paths[h].method}: ${paths[h].path}', which is being defined in app '${this.appName}', has already been defined in the following app: '${paths[h].app}'`)
    } else {
      paths[h] = {
        method,
        path,
        app: this.appName
      }
    }

  }

}

module.exports = Controller
