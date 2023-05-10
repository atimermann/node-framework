

## ResponseHandler e ErrorHandler

Toda api que criamos precisamos tratar erros e o json de retorno, isso acaba se tornando uma tarefa repetitiva além de 
poluir o código.

E para automatizar esta tarefa foram criados o ResponseHandler e o ErrorHandler

Com isso podemos criar um padrão de retorno para toda nossa aplicação.

Isso é feito através dos métodos responseHandler e errorHandler implementados no controller

Você pode usar o padrão disponibilizado pelo Controlador ou estender esses métodos e criar seu próprio padrão

Normalmente estendemos o errorHandler pois cada aplicação tem suas regras para tratamento e exibição de erros.

### Como funciona?

Fazendo uso do Async/Await (que não é utilizado pelo express) o controller intercepta os seguintes métodos:

* all
* use
* get
* post
* put
* delete
* patch

executandos e aguardando o retorno de uma Promessa (await) com o responseado da operação

Por exemplo, vamos definir o seguinte endpoint:

```javascript

route() {

    this.get(`/minhaRota`, async (request, response) => {
      response.status(201)

      // Em vez de:
      // response.json("Minha Resposta")
      // retornamos diretamente:
      return "Minha Resposta."
    })
}

```

O controller vai criar automaticamente seguinte resposta:

```javascript
    response.json({
      error: false,
      data: "Minha Resposta."
    }
```

Este código é executado internamente dentro de um try catch e caso alguma exceção seja detectada o retorno será:

```javascript
    response.json({
      error: true,
      message: error.message
    }
```

### Como é implementado internamente?

Internamente na classe base do controller o comportamento do response e error são implementados da seguinte maneira:


Response:
```javascript

async responseHandler (lastCallback, request, response, ...args) {
  try {
      response.json({
        error: false,
        data: await endpointFunction(request, response, ...args)
      })
    } catch (err) {
      const { status, errorInfo } = await this.errorHandler(err, request, response)
      response.status(status).json(errorInfo)
    }
}
```

onde endpointFunction é o método que criamos em nosso endpoint

Error:
```javascript
async errorHandler (err, request, response) {
    return {
      status: 400,
      errorInfo: {
        error: true,
        message: err.message
      }
    }
}
```

### Como alterar o comportamento do responseHandler e errorHandler

É simples, basta reescrever estes métodos no controller.

Uma dica é criar uma classe intermerdiaria que é estendida por todos os seus controllers

exemplo:

```javascript

const Controller = require('node-framework/controller')


class ExtendedController extends Controller {

    async responseHandler (lastCallback, request, response, ...args) {
      try {
          response.json({
            sucess: true,
            data: await endpointFunction(request, response, ...args)
          })
        } catch (err) {
          const { status, errorInfo } = await this.errorHandler(err, request, response)
          response.status(status).json(errorInfo)
        }
    }

    async errorHandler (err, request, response) {
        let status = 400
    
        if (err.message === 'Erro especifico'){
            status = 401
        }
    
        return {
          status,
          errorInfo: {
            sucess: false,
            message: err.message
          }
        }
    }


}

module.exports = ExtendedController

```

Nosso controller:
```javascript

class meuController extends ExtendedController{}

}

```

## Rota Padrão

Podemos configurar uma rota padrão no controller, que funcionará como prefixo da rota.

Por exemplo, vamos supor q todas as rotas do nosso controller começa com:

    /api/v1/clients

Para isso basta definir o atributo path:

```javascript
class HelloWorldController extends Controller {
  path = '/api/v1/clients'  

  /**
   * Configuração de Rotas
   */
  routes () {
    /**
     * API Client
     */
    this.get('/', async (request, response) => {
      response.json(await ClientModel.findAll())
    })

    this.get('/:id', async (request, response) => {
      const client = await ClientModel.findById(request.params.id)

      client
        ? response.json(client)
        : response.status(404).json(null)
    })
  }
}

```
