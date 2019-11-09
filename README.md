# Projeto Sindri Framework 2.0

Framework minimalista para nodejs que tem como objetivo principal ter uma base de código pronta para o rápido inicio de
projeto e codificação, utilizando tecnologias já disponíveis.

## Instalação

Para ajudar no desenvolvimento de projetos utilizando o framework, foi criado uma ferramenta chamada **sindri-cli**.

Instale com o seguinte comando:

```bash
$ npm i -g sindri-cli
```

Para criar um novo projeto digite:

```bash
$ sindri create
```

**NOTA:** O diretório deve estar vazio

Responda as perguntas conforme abaixo:

```bash
? Nome do projeto? <Nome do projeto, por padrão o nome da pasta, não pode conter caracteres especiais>
? Descrição do projeto: <Descrição Simples>
? Versão 0.0.1 <Versão no padrão X.Y.Z>
? Seu nome: <Seu nome e sobrenome, será usado ao configurar o projeto com npm>
? Informe um e-mail válido 
? Você precisa criar pelo menos um app para este projeto, selecione um nome: helloWorld

<Todo projeto precisa de pelo menos um app padrão, digite o nome desejado aqui, também não pode conter caracteres especiais>
```


Pronto, este script irá:
 
* Criar a estrutura de diretório básica.
* Criar um projeto nodejs (npm init)
* Inicializar o git no diretório atual (se instalado)
* Instalar dependencias (como sindri-framework)

Para verificar se tudo ocorreu como esperado, execute:

```bash
$ sindri install-assets
```

e execute a aplicação com:

```bash
$ node main.js
```

Agora, no seu navegador acesso a url:


  http://localhost:3001


Você deverá ver algo como isto
![Screen01](./docs/img/image001.png)


## Entendendo o Sindri Framework

[Clique aqui para entender como o framework funciona](./docs/entendendo_o_sindri_framework.md)

## Objetivos e Funcionalidades 

Os principais objetivos deste projeto são:

* Exclusivo para Backend(nodejs)
* Utilização do framework ExpressJs (mais utilizado no momento da criação do Sindri-Framework)
* Padrão ES6 ou mais novo

Suporte Integrado à



* Apps - Possibilidade de importar outros modulos desenvolvido no Sindri Framework, como por exemplo um painel administrativo completo ou um simples gerenciador de erros. Apps funcionam como plugins que podem ser facilmente integrados ao framework.
* Socket e Cluster (integração com a biblioteca [SocketCluster](https://socketcluster.io/#!/))
* Compilação binária (Intergração com o pacote [pkg](https://www.npmjs.com/package/pkg) )
* Log Robusto (Integração com [Winstonjs](https://github.com/winstonjs/winston) e [GrayLog](https://www.graylog.org/) )
* Configuração - (Integrado com o [config](https://www.npmjs.com/package/config) )
  * https://itnext.io/node-js-configuration-and-secrets-management-acd84375ca7
  * https://github.com/schikin/example-node-config
  * Remoção do suporta a passar parâmetros via argumentos (argv). Não funciona no docker e não é recomendável. Deve ser
    implementado pela aplicação.

Outras funcionalidades podem ser facilmente implementada através de apps.

## Guia de Estilo

Sindri também disponibiliza um guia de estilo para melhorar qualidade e padronização de codificação:

[Clique Aqui](./docs/guia_de_estilo.md)


### Versões Nodejs:

Um dos objetivos do framework é a possibilidade de criar versões comerciais (binario) com a ferramenta pkg.

A ferramenta PKG utiliza uma versão própria do nodejs para gerar o binário e infelizmente nem sempre a ultima versão 
disponível pelo PKG é a ultima versão disponível do nodejs.

Então, caso pretenta criar binários do seu projeto, para evitar incompatibilidades, recomenda-se utilizar no 
desenvolvimento a mesma versão disponível pelo pkg.
 
Abaixo segue a ultima versão do nodejs em que o Sindri Framework foi desenvolvido e que também está disponível 
para geração de binário com PKG:

Versão do Framework (Apenas major e minor) seguido da versão do NODEJS

* sindri-framework@2.0 - Node@10.4.1 LTS
* sindri-framework@2.1 - Node@12.2.0 LTS - pkg@4.3.4

**IMPORTANTE:** Sempre que atualizar o Sindri Framework, verificar ultimas versões e atualizar aqui. Mantenha o 
histórico e sempre atualize a versão minor do sindri.

**DICA:** Verifique as versões do nodejs instaladas para o node-pkg aqui: /home/andre/.pkg-cache/

## Arquitetura

[Clique aqui para entender mais a fundo a arquitetura do framework](./docs/arquitetura.md)

## Guia de Desenvolvimento

Guia para desenvolvedores do Sindri Framework:

[Guia de Desenvolvimento](./docs/guia_de_desenvolvimento.md)

## TODOs

* Suporte CDN https://github.com/niftylettuce/express-cdn
* JS-2-DOC MARDKDOWN
