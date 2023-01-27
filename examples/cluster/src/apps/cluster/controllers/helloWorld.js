/**
 * **Created on 27/01/2023**
 *
 * apps/cluster/controllers/helloWorld.js
 * @author André <andre@timermann.com.br>
 *
 */
'use strict'

const Controller = require('@agtm/sindri-framework/controller')
const logger = require('@agtm/sindri-framework/logger')
const config = require('@agtm/sindri-framework/config')

class HelloWorldController extends Controller {
  /**
   * Inicialização
   */
  setup () {
    logger.info('Configuring your project...')
  }

  /**
   * Middlware Pré
   */
  async pre () {
    logger.info('Executando Middleware Pre do Sindri Framework...')
    await this.sleep(1000)

    this.use(async (req, res, next) => {
      // Aguarda 1 segundo
      logger.info('Executando Middleware do Express...')
      await this.sleep(1000)
      logger.info('Middleware executado!')

      // Obrigatório executar no final
      next()
    })

    // Você pode manipular rotas do controller aqui!!! Pode ser usado para criar uma autenticação prévia
    // Rota pode ser acessado via "this.router"
    // Documentação como utilizar a rota usda no framework aqui:
    //          https://expressjs.com/pt-br/guide/routing.html#express-router
    //          https://expressjs.com/pt-br/guide/using-middleware.html
    // Autenticação:
    //          https://scotch.io/tutorials/route-middleware-to-check-if-a-user-is-authenticated-in-node-js
  }

  /**
   * Middlware Pós
   */
  pos () {
    setTimeout(() => {
      logger.info(`Seu novo projeto Sindri está online! Acesse pela url: http://localhost:${config.sindri.server.port}`)
    }, 2000)
  }

  /**
   * Configuração de Rotas
   */
  routes () {
    this.get('/', async (request, response) => {
      // partials e cache são atributos especiais que permitem configurar o template
      const renderedPage = await this.view('helloWorld.html', {
        title: 'Hello World - Sindri Framework',
        body: 'Hello World - Sindri Framework',
        partials: { p: 'partial' },
        cache: false
      })

      response
        .status(200)
        .send(renderedPage)
    })
  }
}

module.exports = HelloWorldController
