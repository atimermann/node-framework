/**
 * **Created on 12/11/18**
 *
 * src/library/sindriConfigConfig.js
 * @author André Timermann <andre.timermann@smarti.io>
 *
 *   Realiza Pré Configuração do módulo Config para ser usado internamente pelo Sindri
 *
 */
'use strict'

// const config = require(process.cwd() + '/node_modules/config') // *Fix para funcionar com PKG
// const config = require('../vendor/config/lib/config') // *Fix para funcionar com PKG
const config = require('config')

const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

// Carrega atributos default no config
const defaultConfigPath = path.join(__dirname, '../config.default.yaml')
config.util.setModuleDefaults('sindri', yaml.safeLoad(fs.readFileSync(defaultConfigPath, 'utf8')))

module.exports = config
