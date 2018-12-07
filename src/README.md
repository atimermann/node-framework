
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
  * Remoção do suporta a passar parâmetros via argumentos (argv). Não funciona no docker e não é recomendável. Deve ser
    implementado pela aplicação.


Outras funcionalidades podem ser facilmente implementada através de apps

Sindri também tem o intuito de seguir como um *Guia de Estilo* com recomendações de codificações e padrões:

* Uso do [EsLint](https://eslint.org/) para padrões de código com template (.eslintrc.yaml)
* [JSDocs](http://usejsdoc.org/) para documentação de código
  * https://www.npmjs.com/package/jsdoc-to-markdown
* Uso do Docker
* Uso do [NDB](https://github.com/GoogleChromeLabs/ndb) para depuração
* Manter documentação do projeto atualizada


