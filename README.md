# Projeto Sindri Framework 2.0

Projeto e tasklist no [YouTrack](http://host01.lifiweb.com.br:4002/issues?q=project:%20%7BSindri%20Framework%202%7D)

### Versões Nodejs:

* 2.0 - 10.13 LTS (Documentar atualização)


## Introdução

Framework minimalista para nodejs que tem como objetivo principal ter uma base de código pronta para o rápido inicio de
projeto e codificação, utilizando tecnologias já disponível não reinventando a roda.

Além disso, outros objetivos do projeto são:

* Exclusivo para Backend(nodejs)
* Utilização do framework ExpressJs (mais utilizado no momento da criação do Sindri-Framework)
* Padrão ES6

Suporte Integrado à

* Apps - Reaproveitamento de código/projetos (podemos importar outros projetos desenvolvido no Sindri Framework como por
  exemplo painel administrativo, ou módulo para gerenciamento de erro.)
* Socket e Cluster (integração com a biblioteca [SocketCluster](https://socketcluster.io/#!/))
* Compilação binária (Intergração com o pacote [pkg](https://www.npmjs.com/package/pkg) )
* Log Robusto (Integração com [Winstonjs](https://github.com/winstonjs/winston) e [GrayLog](https://www.graylog.org/) )
* Configuração - (Integrado com o [config](https://www.npmjs.com/package/config) )
  * https://itnext.io/node-js-configuration-and-secrets-management-acd84375ca7
  * https://github.com/schikin/example-node-config


Outras funcionalidades podem ser facilmente implementada através de apps

Sindri também tem o intuito de seguir como um *Guia de Estilo* com recomendações de codificações e padrões:

* Uso do [EsLint](https://eslint.org/) para padrões de código com template (.eslintrc.yaml)
* [JSDocs](http://usejsdoc.org/) para documentação de código
* Uso do Docker
* Uso do [NDB](https://github.com/GoogleChromeLabs/ndb) para depuração
* Mensagens de Erro em Inglês (Comentário livre permitido rápido desenvolvimento, mas para abertura de código necessário
  traduzir)
* Manter documentação do projeto atualizada
* Sempre criar uma pasta exemples para que o usuário possa testar o projeto


## Guia de Desenvolvimento

* Sempre documentar implementações e alterações do Framework
* Gerenciamento do projeto no YouTrack oficial
* Sempre testar compatíbilidade com PKG antes de gerar versão
* Controle de versão ( [SEMVER](https://semver.org/lang/pt-BR/) )
  * Atualizar versão do nodejs usada em cada nova versão liberada (em 'Versões Nodejs')
* Raiz do projeto GIT está em **/**
* Raiz do projeto NPM está em **src**
  * Manter na pasta NPM apenas diretórios relevantes para execução, documentação e outros manter fora.
  * Lembre que o NPM apenas para publicação e uso de outras aplicações, não precisa ter todos os arquivos do projeto.
* Manter pasta exemplo atualizada com versão exemplo de uso do framework


## Arquitetura

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
