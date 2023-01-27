/**
 * **Created on 27/01/2023**
 *
 * main.js
 * @author André <andre@timermann.com.br>
 *
 * Teste do socketclueter
 *
 */
'use strict'
require('module-alias/register')

const Application = require('@agtm/sindri-framework/application')
const Server = require('@agtm/sindri-framework/server')

const cluster = new Application(__dirname, 'cluster')

if (require.main === module) {
  // Inicializa Servidor
  Server.init(cluster)
} else {
  module.exports = cluster
}
