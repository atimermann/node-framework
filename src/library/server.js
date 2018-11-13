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

/*
 * TODO: Remover output colorido
 * TODO: Configurar Log de acordo para ficar compatível com logstach ou outro de forma facil (PESQUISA)
 * TODO: Não utilizar métodos na configuração pois a configuração será serializada para ser enviada a outro Processo
 *
 *
 */

const config = require('./config')
const os = require('os')
const _ = require('lodash')
const path = require('path')

module.exports = {

  /**
   * Inicializa Servidor
   *
   */
  init() {

    let clusterMode = process.env.CLUSTER_MODE || config.get('sindri.clusterMode')

    clusterMode
      ? this.loadCluster()
      : this.loadServer()

  },


  /**
   * Inicializa Cluster Socket Cluster
   */
  loadCluster() {


    const SocketCluster = require('socketcluster')

    let options = _.clone(config.get('sindri.cluster'))

    //The path to a file used to bootstrap worker processes
    options.workerController = path.join(__dirname, 'worker.js')

    //The path to a file used to bootstrap broker processes
    options.brokerController = null

    //The path to a file used to bootstrap the workerCluster process
    options.workerClusterController = null

    // TODO: Fazer um loop em todos os atributos definidos em config.default e verificar se existe na variavel de ambiente de forma dinamica ex: 'CLUSTER_' + 'attribute'
    if (process.env.CLUSTER_WORKERS) options.workers = process.env.CLUSTER_WORKERS
    if (process.env.CLUSTER_PORT) options.port = process.env.CLUSTER_PORT


    if (options.workers === 'auto') options.workers = os.cpus().length
    options.logLevel = 0


    new SocketCluster(options)

  },


  /**
   * Inicializa Servidor Sindri diretamente sem suporte a cluster nem socket
   */
  loadServer() {

    const Kernel = require('./kernel')

    Kernel.run()


  }

}