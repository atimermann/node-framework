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
const _ = require('lodash')
const path = require('path')
const { logger } = require('./logger')
const Application = require('./application')

module.exports = {

  /**
   * Inicializa Servidor
   *
   * @param application {Application}
   */
  init (application) {
    try {
      if (!(application instanceof Application)) throw new TypeError('application must be instance of Application')

      const clusterMode = process.env.CLUSTER_MODE || config.get('sindri.clusterMode')

      logger.info('Modo Cluster: ' + (clusterMode ? 'Ativo' : 'Inativo'))

      clusterMode
        ? this.loadCluster(application)
        : this.loadServer(application)
    } catch (error) {
      logger.error(error.stack)
      process.exit()
    }
  },

  /**
   * Inicializa Cluster Socket Cluster
   *
   * @param application {Application}
   */
  loadCluster (application) {
    const SocketCluster = require('socketcluster')

    const options = _.clone(config.get('sindri.cluster'))

    // The path to a file used to bootstrap worker processes
    options.workerController = path.join(__dirname, 'worker.js')

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

    new SocketCluster(options)
  },

  /**
   * Inicializa Servidor Sindri diretamente sem suporte a cluster nem socket
   *
   * @param application {Application}
   */
  loadServer (application) {
    const Kernel = require('./kernel')
    Kernel.run(application.getApplicationData())
  }

}
