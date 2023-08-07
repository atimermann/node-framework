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

import { Multi } from '@agtm/util'

// Mixins
import SocketMixin from './socket-mixin.mjs'
import JobsMixin from './jobs-mixin.mjs'
import HttpMixin from './http-mixin.mjs'
import HttpViewMixin from './http-view-mixin.mjs'

/**
 * @mixes JobsMixin
 */
class Controller extends Multi.inherit(SocketMixin, JobsMixin, HttpMixin, HttpViewMixin) {
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
    super()
    if (new.target === Controller) {
      throw new TypeError('Cannot construct Abstract instances directly')
    }
  }

  get completeIndentification () {
    return `application: ${this.applicationName}, app: ${this.appName}, controller: ${this.controllerName}`
  }
}

export default Controller
