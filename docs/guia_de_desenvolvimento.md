# Guia de Desenvolvimento


* Sempre documentar implementações e alterações do Framework
* Gerenciamento do projeto no YouTrack oficial
* Controle de versão ( [SEMVER](https://semver.org/lang/pt-BR/) )
  * Atualizar versão do nodejs usada em cada nova versão liberada (em 'Versões Nodejs')
* Raiz do projeto GIT está em **/**
* Raiz do projeto NPM está em **src**
  * Manter na pasta NPM apenas diretórios relevantes para execução, documentação e outros manter fora.
  * Lembre que o NPM apenas para publicação e uso de outras aplicações, não precisa ter todos os arquivos do projeto.
* Manter pasta exemplo atualizada com versão exemplo de uso do framework
* Sempre testar compatíbilidade com PKG antes de gerar versão
* Sempre manter atualizado o scripts do projeto sindri-cli compatível com a versão do framework.
* Testar scripts antes de gerar nova versão (Automatizar com CI)

### Mantendo compatibilidade com PKG

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


Alguns módulos como socketcluster precisam ser inteiramente adicionado no pkg e de forma manual:

```
  "pkg": {
    "assets": [
      "node_modules/sc-broker",
      "node_modules/socketcluster"
    ]
  }
```

**NOTA:** Scripts podem ser adicionado em assets ou scripts, em scripts são pré-compilados, ocultando o fonte, os assets
são adicionados no formato raw, podendo ser lidos facilmente, porém aumenta performance de execução, permite qualquer
tipo de arquivo e permite adicionar o diretório inteiro

### Mantendo Sindri-cli atualizado

Ao atualizar o sindriframework mantenha também autalizado o sindri-cli

### Erro ao executar build com o pacote config

O pacote config não funciona com o pkg, foi necessário incorpora-lo ao projeto dentor da pasta vendor, ao atualizar,
verificar se problema foi corrigido ou atualizar config manualmente 
