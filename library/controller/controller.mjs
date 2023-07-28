// noinspection JSUnusedGlobalSymbols
/**
 * **Created on 16/11/18**
 *
 * library/controller/controller.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 *   Classe Abstrata que representa Controlador do MVC, aqui fica o ponto de entrada da nossa aplicação, desde execução de serviços, configuração de
 *   rotas, middleware (Para implementação de plugins) entre outros
 *
 * REF: Definindo classe abstrata - https://stackoverflow.com/questions/29480569/does-ecmascript-6-have-a-convention-for-abstract-classes *
 *
 * TODO: Documentar criar um diagrama de fluxo de execução igual do Vuejs
 * TODO: Verificar proxy para deixar alguns atributos readonly
 *
 */

// Mixins
import SocketMixin from './socket-mixin.mjs'
import JobsMixin from './jobs-mixin.mjs'
import HttpMixin from './http-mixin.mjs'
import HttpViewMixin from './http-view-mixin.mjs'

class Controller {
  /**
   * Nome da aplicação que este controller pertence
   * Definido em controllerController, não alterar
   *
   * @type {string}
   */
  applicationName = undefined

  /**
   * Nome da app que este controller pertence
   * Definido em controllerController, não alterar
   *
   * @type {string}
   */
  appName = undefined

  /**
   * None desde controller
   * Definido em controllerController, não alterar
   *
   * @type {string}
   */
  controllerName = undefined

  /**
   * Identificador unico da aplicação
   * Definido em controllerController, não alterar
   *
   * @type {string}
   */
  applicationId = undefined

  /**
   * Objeto com atributo das aplicações
   * Definido em http-server, não alterar
   *
   * @type {{}}
   */
  applications = undefined

  /**
   * Objeto Express
   * Definido em http-server, não alterar
   *
   * @type {{}}
   */
  app = undefined

  /**
   * Caminho físico desta App
   * Definido em controllerController, não alterar
   *
   * @type {string}
   */
  appPath = undefined

  /**
   * Caminho físico da aplicação onde esta app está
   * Definido em controllerController, não alterar
   *
   * @type {string}
   */
  applicationsPath = undefined

  constructor () {
    if (new.target === Controller) {
      throw new TypeError('Cannot construct Abstract instances directly')
    }
  }

  get completeIndentification () {
    return `application: ${this.applications}, app: ${this.app}, controller: ${this.controllerName}`
  }
}

Object.assign(
  Controller.prototype,
  SocketMixin,
  JobsMixin,
  HttpMixin,
  HttpViewMixin
)

export default Controller
