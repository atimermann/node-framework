/**
 * **Created on 27/07/2023**
 *
 * apps/main/controllers/helloWorld.mjs
 * @author André <a@b.com>
 *
 */
import { Controller, createLogger, Config } from '@agtm/node-framework'
import { sleep } from '@agtm/util'

const logger = createLogger('HelloWorld')

export default class HelloWorldController extends Controller {
  /**
   * Configuração de Rotas
   */
  routes () {
    this.get('/', async (request, response) => {
      // partials e cache são atributos especiais que permitem configurar o template
      const renderedPage = await this.view('helloWorld.html', {
        title: 'Hello World - Node Framework',
        body: 'Hello World - Node Framework',
        partials: { p: 'partial' },
        cache: false
      })

      response
        .status(200)
        .send(renderedPage)
    })
  }
}
