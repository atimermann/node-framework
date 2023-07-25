# DEPRECATED
# Guia de Desenvolvimento

**IMPORTANTE:** Erros do **tipo UnhandledPromiseRejectionWarning** são extremamente graves, deve ser tratado 
imediatamente, representa uma quebra no fluxo Assincrono, provavelmente algum await ou try catch esquecido

* Sempre documentar implementações e alterações do Framework
* Gerenciamento do projeto no GitLab
* Controle de versão ( [SEMVER](https://semver.org/lang/pt-BR/) )
  * Atualizar versão do nodejs usada em cada nova versão liberada (em 'Versões Nodejs')
* Raiz do projeto GIT está em **/**
* Controlar usando a configurações files em package.json quais arquivos serão publicados  
  * Lembre que o NPM apenas para publicação e uso de outras aplicações, não precisa ter todos os arquivos do projeto.
* Manter pasta exemplo atualizada com versão exemplo de uso do framework
* Sempre testar compatíbilidade com PKG antes de gerar versão
* Sempre manter atualizado o scripts do projeto @agtm/cli-tool compatível com a versão do framework.
* Testar scripts antes de gerar nova versão (Automatizar com CI)

### Mantendo compatibilidade com PKG

**IMPORTANTE:** Sempre mantenha o Framework compatível com PKG

O PKG inclui automaticamente os arquivos necessários no binário, como por exemplo ao utilizar require.

Para incluir arquivos estáticos, como arquivo de configuração temos que utilizar o método **path.join()** para que o PKG
adicione o arquivo automaticamente no binário e isso deve ser feito exatamente da seguinte forma:

> path.join(__dirname, 'PATH')

* Deve ter 2 atributos
* Primeiro atributo deve ser __dirname
* Segundo argumento deve ser uma string, por exemplo '../abc/cde.json'

**IMPORTANTE:** path.resolve não funciona

Caso não seja possível utilizar path.join() ou por outros impedimentos, é possivel adicionar os arquivos manualmente,
definindo os arquivos no arquivo package.json Veja mais detalhes aqui:
https://www.npmjs.com/package/pkg#detecting-assets-in-source-code

**IMPORTANTE:** Caso tenha alguma incompatibilidade (erros) ao importar modulos do node de terceiros , adicione 
manualmente como um asset, não será pré-compilado mas funcionará. 

Alguns módulos como socketcluster precisam ser inteiramente adicionado no pkg e de forma manual:

**TODO:** verificar: "node_modules/sc-broker" e "node_modules/socketcluster",

```
  "pkg": {
    "assets": [

      "node_modules/config"
    ]
  }
```

**NOTA:** Scripts podem ser adicionado em assets ou scripts, em scripts são pré-compilados, ocultando o fonte, os assets
são adicionados no formato raw, podendo ser lidos facilmente, porém aumenta performance de execução, permite qualquer
tipo de arquivo e permite adicionar o diretório inteiro

* ~~É possível adicionar pacotes em assets em subprojetos~~ 

### Mantendo Sindri-cli atualizado

Ao atualizar o sindriframework mantenha também autalizado o sindri-cli

### PKG

Tabela comparando como um arquivo é carregado e empacotado:

**REF:** https://github.com/zeit/pkg#snapshot-filesystem

value                          | with `node`         | packaged                   | comments
-------------------------------|---------------------|----------------------------|-----------
__filename                     | /project/app.js     | /snapshot/project/app.js   |
__dirname                      | /project            | /snapshot/project          |
process.cwd()                  | /project            | /deploy                    | suppose the app is called ...
process.execPath               | /usr/bin/nodejs     | /deploy/app-x64            | `app-x64` and run in `/deploy`
process.argv[0]                | /usr/bin/nodejs     | /deploy/app-x64            |
process.argv[1]                | /project/app.js     | /snapshot/project/app.js   |
process.pkg.entrypoint         | undefined           | /snapshot/project/app.js   |
process.pkg.defaultEntrypoint  | undefined           | /snapshot/project/app.js   |
require.main.filename          | /project/app.js     | /snapshot/project/app.js   |
