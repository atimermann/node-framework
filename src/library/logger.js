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

const {createLogger, format, transports} = require('winston')
const Log2gelf = require('./winstonTransport/winston-graylog')
const config = require('./config')
const moment = require('moment')


let hrstart = process.hrtime.bigint()

/**
 * Informação do Cluster
 *
 * @type {object}
 */
let clusterInfo = {
  node: null,
  leader: null
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// Transport
//////////////////////////////////////////////////////////////////////////////////////////////////
let transportsList = []

//////////////////////
// Console
//////////////////////
if (config.get('sindri.logger.console.enabled')) {

  transportsList.push(new transports.Console({
    handleExceptions: config.get('sindri.logger.console.handleExceptions')
  }))

}

//////////////////////
// GrayLog
//////////////////////

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
    exitDelay: 1000, // leave Log2gelf 1sec to send the message
  })

  transportsList.push(log2gelf)

}

//////////////////////////////////////////////////////////////////////////////////////////////////
// Format
//////////////////////////////////////////////////////////////////////////////////////////////////

const myFormat = format.printf(info => {

  /* eslint-disable-next-line - Eslint não suporte bitInt ainda, por estar no stage3*/
  let time = parseFloat((process.hrtime.bigint() - hrstart) / 1000000n)
  return `[${info.timestamp}] [${time / 1000}]${clusterInfo.node !== null ? ' [Node' + clusterInfo.node + ']' : ''}${(clusterInfo.leader ? ' [L]' : '')} [${info.level}] ${info.message}`

})


//////////////////////////////////////////////////////////////////////////////////////////////////
// Logger
//////////////////////////////////////////////////////////////////////////////////////////////////
let logger = createLogger({
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
  updateClusterInfo(node, leader) {

    if (log2gelf) log2gelf.updateClusterInfo(node, leader)

    clusterInfo = {
      node,
      leader
    }
  }
}


