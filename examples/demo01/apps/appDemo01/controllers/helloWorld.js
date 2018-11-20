/**
 * **Created on 16/11/18**
 *
 * examples/demo01/apps/appDemo01/controllers/helloWorld.js
 * @author André Timermann <andre.timermann@smarti.io>
 *
 */
'use strict'

const Controller = require('sindri-framework/controller')

const logger = require('sindri-framework/logger')

class HelloWorldController extends Controller {

  /**
   * Inicialização
   */
  setup() {

    logger.info('HelloWorld Demo01')


    logger.debug('Debug')
    logger.error('Error')

    logger.info('====================================================================================================')
    logger.info(`Setup do controlador '${this.controllerName}'. App: '${this.appName}'. Application: '${this.applicationName}'`)
    logger.info(`Options: ${JSON.stringify(this.options)}`)


    if (this.socketWorker) {
      logger.info(`ID: ${this.socketWorker.id}`)
      logger.info(`Leader: ${this.socketWorker.isLeader}`)
      logger.info(`Host: ${this.socketServer.host}`)
      logger.info(`Secure: ${this.socketServer.secure}`)


      let chatChannel = this.socketServer.exchange.subscribe('chat')

      /**
       * Inscrição no canal com sucesso
       */
      chatChannel.on('subscribe', channelName => {
        logger.info('Inscrito no canal: ' + channelName)

        /**
         * Vamos dar um tempoa até que todos estejam inscrito no canal
         */
        setTimeout(() => {

          /**
           * Agora vamos enviar uma mensagem para o canal avisando que estamos inscrito
           *
           */
          chatChannel.publish('Novo Servidor conectado no canal às ' + new Date())

        }, 4000)
      })

    }
    logger.info('====================================================================================================')

  }

  /**
   * Configuração de Rotas
   */
  routes() {

    this.get('/helloWorld', async (request, response) => {


      // partials e cache são atributos especiais que permitem configurar o template
      let renderedPage = await this.view('page.html', {
        title: 'Hello World',
        body: 'Corpo da página With <p>',
        escaped_html: '<p>This is a post about &lt;p&gt; tags</p>',
        partials: {p: 'partial'},
        cache: false
      })

      response
        .status(200)
        .send(renderedPage)


    })

  }
}

module.exports = HelloWorldController