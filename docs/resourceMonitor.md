# ResourceMonitor

## Visão Geral

`ResourceMonitor` é uma classe destinada a monitorar o uso de recursos, principalmente a memória, em uma aplicação Node.js.
Util para identificar memory leak.

Quando habilitado exibe no log informação de memoria consumida.

Se  dumpMemory estiver ativo, exibe detalhes (operação demorada).

Faz uso da biblioteca https://github.com/airbnb/node-memwatch

## Configuração

```yaml
  enabled: false
  # Habilita dump de memória em intervalo definido por dumpInterval, mostra diferença de alocação
  #  - Utilizar apenas em caso de análise, muito pesado, comsome muito recurso de processamento
  #  - Exibe elementos muito alocados ou com muito crescimento de consumo
  dumpMemory:
    enabled: false
    # em minutos
    dumpInterval: 60
    # Elementos com tamanho em bytes maior que detailSizeLimit serão exibidos em detalhes
    detailSizeLimit: 10000
    # Elementos com mais nodes criados que detailSizeLimit serão exibidos em detalhes
    detailNodesLimit: 20
```

TODO: Interface Web no nf-monitor 