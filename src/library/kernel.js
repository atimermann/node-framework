/**
 * **Created on 13/11/18**
 *
 * src/library/kernel.js
 * @author André Timermann <andre.timermann@smarti.io>
 *
 *   Nucleo do Framework, onde o servidor é configurado e inicializado.
 *   Inicializa Expressjs, aplicações e sobre o servidor
 *
 *   Pode ser carregado standalone ou através de cluster
 *
 */
'use strict'

const {logger} = require('./logger')

module.exports = {


  run() {

    logger.info('Inicializando Sindri...')


  }


}