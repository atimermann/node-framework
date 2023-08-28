# Documentação de Configuração

A classe `Config` é um utilitário para gerenciar configurações do sistema a partir de várias fontes, incluindo arquivos .env, variáveis de ambiente do sistema e arquivos YAML.


## Obtendo valores de configuração

Use o método `get` para obter valores de configuração. Este método aceita duas entradas, a chave que você deseja obter e o tipo esperado de retorno.

A chave segue o padrão `dot notation`, para representar a profundidade do objeto.

```javascript
const serverPort = Config.get('httpServer.port', 'number')
```
O exemplo acima vai buscar a configuração "port" dentro do objeto "server". O segundo argumento, 'number', indica que o valor deve ser convertido para um número antes de ser retornado.

Os tipos possíveis são: 

* number
* boolean
* string
* array

Quando definido tipo array, a string "abcd:efg:hij" será convertido para ["abcd", "efg", "hij"]

## Obtendo valores mantendo maiusculo-minusculo e ignorando .env

Em alguns casos pode ser necessário obter configuração utilizando case-sensitive, para isso podemos utilizar:

```javascript
const serverPort = Config.getYaml('httpServer.helmet', 'number')
```

**IMPORTANTE:** Neste caso, as configuranções vindas das váriaveis de ambiente serão ignorado.

Útil também quando precisamos obter um objeto de configuração e precisamos manter na chave maiusculo e minusculo 

## Variáveis de ambiente

Todas as variáveis de ambiente disponíveis serão convertidas para o formato "abc.def" para corresponder à estrutura das chaves de configuração. Por exemplo, uma variável de ambiente chamada HTTP_SERVER_PORT será convertida para http.server.port nas configurações.

Se você tiver um arquivo `.env`, as variáveis de ambiente definidas nesse arquivo também serão carregadas e adicionadas às configurações.

## Prioridade das configurações

As configurações são carregadas em uma ordem específica para determinar a prioridade. A ordem de prioridade é a seguinte:

1. Variáveis de ambiente do sistema operacional. Elas têm a prioridade mais alta.
2. Configurações definidas no arquivo `.env`. 
3. Configurações definidas no arquivo `config.{NODE_ENV}.yaml` localizado no diretório do projeto
4. Configurações definidas no arquivo `config.default.yaml` localizado no diretório do projeto 
5. Configurações definidas no arquivo `config.{NODE_ENV}.yaml`  localizado em `node_modules/@agtm/node-framework`.
6. Configurações definidas no arquivo `config.default.yaml` localizado em `node_modules/@agtm/node-framework`.

As configurações de uma fonte sobrescrevem as configurações da fonte anterior na lista acima.

É importante notar que as configurações definidas nas etapas superiores têm prioridade sobre as etapas inferiores. Portanto, as configurações definidas em um arquivo YAML terão prioridade sobre as configurações definidas no arquivo `.env`, por exemplo.

## Maiusculo e minisculo

Configuração não é "case-sensitive" ou seja, não faz diferenta chamar:

    Config.get('minhaConfigura.x') ou Config.get('MINHACONFIGURACAO.X')  

## Caso de configuração aninhada no ENV

No exemplo dado:

```javascript
HTTP_SERVER="123"
HTTP_SERVER_PORT="456
```

* Se você solicitar **Config.get("http.server")**, o valor retornado será **"123"**. Isso ocorre porque a chave **HTTP_SERVER** é uma configuração específica para o atributo **http.server**, então ela tem prioridade sobre o subatributo **port** que está abaixo dela.

* Por outro lado, se não houver um atributo **HTTP_SERVER** definido e você solicitar **Config.get("http.server")**, o valor retornado será **{ port: 456 }**. Nesse caso, como o atributo **HTTP_SERVER** não está presente, o valor padrão do subatributo **port** é usado, que é definido como **456**.

## Aplicações externas carregadas

Configurações definidas em outras aplicações carregadas em main.mjs serão ignoradas.