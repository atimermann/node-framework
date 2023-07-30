/**
 * Created on 28/07/23
 *
 * library/controller/http-view-mixin.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import path from 'path'
import consolidate from 'consolidate'

export default class HttpViewMixin {
  /**
   * URL base padrão  para acesso a recursos estáticos.
   * Será usado pelo Helper @asset, que calcula automaticamente a url do recurso que será carregado na página
   *
   * Definido em http-server
   *
   * @type {string}
   */
  staticBaseUrl = undefined

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
  async view (templatePath, locals = {}, engine = 'handlebars') {
    const viewPath = path.join(this.appPath, 'views', templatePath)
    return this._renderView(viewPath, locals, engine)
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
   * @returns {Promise<void>}
   */
  async remoteView (applicationName, appName, templatePath, locals = {}, engine = 'handlebars') {
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
  async _renderView (viewPath, locals, engine) {
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
}
