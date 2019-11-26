/**
 * **Created on 13/11/18**
 *
 * src/library/logger.js
 * @author André Timermann <andre.timermann@smarti.io>
 *
 *   Sistema de Log Pré-Configurado baseado no Winston com suporte GrayLog e Console
 *
 *   Para importar use a seguinte sintaxe:
 *
 *      const {logger} = require('./logger')
 *
 */
'use strict'

const { createLogger, format, transports } = require('winston')
const Log2gelf = require('./winstonTransport/winston-graylog')
const config = require('./config')

const hrstart = process.hrtime()
const start = hrstart[0] + (hrstart[1] / 1000000000)

/**
 * Informação do Cluster
 *
 * @type {object}
 */
let clusterInfo = {
  node: null,
  leader: null
}

/// ///////////////////////////////////////////////////////////////////////////////////////////////
// Transport
/// ///////////////////////////////////////////////////////////////////////////////////////////////
const transportsList = []

/// ///////////////////
// Console
/// ///////////////////

// TODO: BUG, transport Console, parece q é carregadfo por padrão, mesmo desativando está exibindo log no console - https://github.com/winstonjs/winston/issues/175

const consoleEnabled = (process.env.LOGGER_CONSOLE_ENABLED !== undefined)
  ? process.env.LOGGER_CONSOLE_ENABLED
  : config.get('sindri.logger.console.enabled')

if (consoleEnabled) {
  transportsList.push(new transports.Console({
    handleExceptions: config.get('sindri.logger.console.handleExceptions')
  }))
}

/// ///////////////////
// GrayLog
/// ///////////////////

/**
 * Instancia log2gelf
 */
let log2gelf

if (config.get('sindri.logger.graylog.enabled')) {
  log2gelf = new Log2gelf({
    host: config.get('sindri.logger.graylog.host'),
    port: config.get('sindri.logger.graylog.port'),
    handleExceptions: config.get('sindri.logger.graylog.handleExceptions'), // handle exception within Log2gelf
    exitOnError: true, // exit after exception has been sent
    exitDelay: 1000 // leave Log2gelf 1sec to send the message
  })

  transportsList.push(log2gelf)
}

/// ///////////////////////////////////////////////////////////////////////////////////////////////
// Format
/// ///////////////////////////////////////////////////////////////////////////////////////////////

const myFormat = format.printf(info => {
  const hrtime = process.hrtime()
  const stop = hrtime[0] + hrtime[1] / 1000000000

  /* eslint-disable-next-line - Eslint não suporte bitInt ainda, por estar no stage3 */
  let time = stop - start
  time = Math.round(time * 1000) / 1000

  return `[${info.timestamp}] [${time}]${clusterInfo.node !== null ? ' [Node' + clusterInfo.node + ']' : ''}${(clusterInfo.leader ? ' [L]' : '')} [${info.level}] ${info.message}`
})

/// ///////////////////////////////////////////////////////////////////////////////////////////////
// Logger
/// ///////////////////////////////////////////////////////////////////////////////////////////////
const logger = createLogger({
  format: format.combine(format.timestamp(), myFormat),
  transports: transportsList,
  level: config.get('sindri.logger.level'),
  silent: config.get('sindri.logger.silent')
})

module.exports = {

  /**
   * Objeto Logger
   */
  logger,

  /**
   * Define Id do nó do cluster
   *
   * @param node  {number}    Id do nó
   * @param leader {boolean}  Se é o Nó leder
   */
  updateClusterInfo (node, leader) {
    if (log2gelf) log2gelf.updateClusterInfo(node, leader)

    clusterInfo = {
      node,
      leader
    }
  }
}
