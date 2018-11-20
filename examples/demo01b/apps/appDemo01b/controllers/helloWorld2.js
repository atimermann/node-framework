/**
 * **Created on 16/11/18**
 *
 * <File Reference Aqui: helloWorld>
 * @author André Timermann <andre.timermann@smarti.io>
 *
 */
'use strict'

const Controller = require('sindri-framework/controller')

class HelloWorld2Controller extends Controller {

  /**
   * Inicialização
   */
  setup() {

    console.log('Demo01b Setup Test!')

  }

  /**
   * Configuração de Rotas
   */
  routes() {

    this.get('/x', async (request, response) => {

      let renderedPage = await this.remoteView(
        'Demo01',
        'appDemo01',
        'page.html',
        {
          title: 'Hello World 2',
          body: 'Template carregado de outra aplicação <p>',
          escaped_html: '<p>This is a post about &lt;p&gt; tags</p>',
          partials: {p: 'partial'},
          cache: false
        }
      )


      response.status(200).send(renderedPage)

    })

  }
}

module.exports = HelloWorld2Controller