/**
 * **Created on 20/09/18**
 *
 * src/library/server.js
 * @author André Timermann <andre.timermann@>
 *
 *   Servidor de execução do Sindri
 *
 */
'use strict'

//  Desabilita alerta sobre configuração não encontrada
process.env.SUPPRESS_NO_CONFIG_WARNING = 1

// TODO: Não utilizar métodos na configuração pois a configuração será serializada para ser enviada a outro Processo

const config = require('./config')
const os = require('os')
const { clone } = require('lodash')
const { join } = require('path')
const { logger } = require('./logger')
const Application = require('./application')

require('dotenv').config()

module.exports = {

  /**
   * Inicializa Servidor
   *
   * @param application {Application}
   */
  async init (application) {
    try {
      if (!(application instanceof Application)) throw new TypeError('application must be instance of Application')

      const clusterMode = process.env.CLUSTER_MODE || config.get('cluster.enabled')

      logger.info('Modo Cluster: ' + (clusterMode ? 'Ativo' : 'Inativo'))

      clusterMode
        ? await this.loadCluster(application)
        : await this.loadServer(application)
    } catch (error) {
      process.env.NODE_ENV === 'development'
        ? console.log(error)
        : logger.error(`${error.code}\n${error.stack}`)
      process.exit()
    }
  },

  /**
   * Inicializa Cluster Socket Cluster
   *
   * @param application {Application}
   */
  async loadCluster (application) {
    console.log('DEPRECATED - DEPRECATED - DEPRECATED - DEPRECATED: Versão 14 do socket-cluster está desatualizado.')

    const SocketCluster = require('socketcluster')

    const options = clone(config.get('cluster'))

    // The path to a file used to bootstrap worker processes
    options.workerController = join(__dirname, 'worker.js')

    // The path to a file used to bootstrap broker processes
    options.brokerController = null

    // The path to a file used to bootstrap the workerCluster process
    options.workerClusterController = null

    // TODO: Fazer um loop em todos os atributos definidos em config.default e verificar se existe na variavel de ambiente de forma dinamica ex: 'CLUSTER_' + 'attribute'
    if (process.env.CLUSTER_WORKERS) options.workers = process.env.CLUSTER_WORKERS
    if (process.env.CLUSTER_PORT) options.port = process.env.CLUSTER_PORT

    if (options.workers === 'auto') options.workers = os.cpus().length
    options.logLevel = 0

    logger.info('(Cluster) Workers: ' + options.workers)
    logger.info('(Cluster) Port:    ' + options.port)

    options.application = application.getApplicationData()

    const socketCluster = new SocketCluster(options)

    socketCluster.on('ready', message => {
      logger.info('SocketCluster has booted up and is ready to accept connections.')
    })

    socketCluster.on('warning', message => {
      logger.warning(message)
    })

    socketCluster.on('fail', err => {
      console.log(err)
      logger.error(err)
      process.exit()
    })
  },

  /**
   * Inicializa Servidor Sindri diretamente sem suporte a cluster nem socket
   *
   * @param application {Application}
   */
  async loadServer (application) {
    const Kernel = require('./kernel')
    await Kernel.run(application.getApplicationData())
  }

}
