
## Integração GrayLog





O Framework tem dois componentes principais:

* Classe Sindri Application
* Objeto Sindri Server

Primeiro instanciamos uma ou mais "application" e iniciamos o server carregando a "application" principal.

Exemplo:

```javascript
const Application = require('sindri-framework/application')
const Server = require('sindri-framework/server')

let demoApplication = new Application(__dirname, {
  name: 'Demo01'
})

// Aqui Carregamos uma aplicação já instanciada (obrigatório)
let demo01b = require('../demo01b')
demoApplication.loadAppplication(demo01b)


if (require.main === module) {
  // Inicializa Servidor
  Server.init(demoApplication)
} else {
  // Permite que aplicação possa ser carregada por outra aplicação principal, comentar se deseja impedir este comportamento
  module.exports = demoApplication
}
```

Este modelo permite que a aplicação atual possa ser carregada por outra aplicação.


## Logger

Sistema de log do Sindri Framework, já foi desenvolvido pensando em grandes projetos.
Baseado no Winston, ele já está bem configurado e pronto pra uso, com suporte a console e graylog, já pensando no uso do docker.

Logger do Sindri foi feito para substituir o console.log que nunca deve ser usado.

Para usa-lo em seu projeto.

Por exemplo:

```javascript
const logger = require('sindri-framework/logger')

logger.info('Mensagem de info')
logger.debug('Dados extras para depuração')
logger.error('Erro encontrado')
```

**ATENÇÃO:** Dentro do Framework a chamada é um pouco diferente:

```javascript
const {logger} = require('sindri-framework/logger')
```

## Criando Apps

TODO: Criar apps, Middleware
TODO: Documentar necessidade de configurar pkg para cada application

### Controller

### TEMPLATE

https://expressjs.com/pt-br/guide/using-template-engines.html
https://www.npmjs.com/package/consolidate
