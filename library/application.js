/**
 * **Created on 20/09/2018**
 *
 * src/library/application.js
 * @author André Timermann <andre.timermann@>
 *
 *   Representa uma aplicação no framework, sempre será instanciado em um novo projeto, pode carregar outras aplicações
 *   ou ser carregado por outras aplicações, possibilitando assim reuso.
 *
 *   TODO: Documentar as varias formas de configuração possível: Na instanciação (configuração HARDCODED: FIXO, Arquivo de configuração/ENV para usuario definir)
 *   TODO: Exigir em cada módulo que documente as configurações possíveis e tipo
 *
 */
'use strict'

const {logger} = require('./logger')
const {defaults} = require('lodash')
const crypto = require('crypto')

class Application {

  /**
   *
   * @param path    {string}  Caminho físico da aplicação (Deve ser definido utilizando __dirname)
   * @param name    {string}  Nome da aplicação que será carregada Obrigatório
   * @param options {object}  Lista de Atributos padrão (default) para nova aplicação, Atributos fixos a ser definido
   *                          via código, paraatributos de usuário utilizar config
   *
   */
  constructor(path, name, options = {}) {

    logger.info(`Instanciando aplicação '${name}'...`)

    if (!name) throw new Error('Attribute "name" is required!')
    if (!path) throw new Error('Attribute "path" is required!')

    if (typeof name !== 'string') throw new TypeError('Attribute "name" must be string! ' + name)
    if (typeof path !== 'string') throw new TypeError('Attribute "path" must be string! ' + path)

    /**
     * Nome da Aplicação
     * @type {string}
     */
    this.name = name

    /**
     * Path da Aplicação
     * @type {string}
     */
    this.path = path

    /**
     * Lista de Aplicações Carregadas
     *
     * @type {Array}
     */
    this.applications = []

    /**
     * Lista de Opções da Aplicação Atual
     *
     * @type {Object}
     */
    this.options = options

    /**
     * Identificador ùnico para a aplicação
     */
    let current_date = (new Date()).valueOf().toString()
    let random = Math.random().toString()
    this.id = crypto.createHash('sha1').update(current_date + random).digest('hex')

    this._addApplication(path, name, this.id, this.options)

  }

  /**
   * Carrega Subaplicação (dependência da aplicação Principal)
   *
   * @param application {Application} Instância da aplicação
   * @param customOptions     {object}      Lista de atributos da aplicação
   */
  loadAppplication(application, customOptions) {

    if (this.constructor.name !== 'Application')
      throw new TypeError('application must be instance of Application')

    logger.info(`Carregando App '${application.name}'. Path: '${application.path}'`)

    for (let {path, name, id, options} of application.applications) {

      // Altera atributos da aplicação que está sendo carregada (Subaplicações apenas carrega)
      if (id === application.id) {
        options = defaults(customOptions, options)
      }

      this._addApplication(path, name, id, options)
    }

  }

  /**
   * Serializa dados da aplicação e retorna dados do projeto (Aplicação Principal)
   *
   * Retorna objeto com todas as informações da aplicação para envio entre nós do clusters
   *
   * TODO: Observar a necessidade de serialização
   *
   * @returns {{name: string, rootPath: string, applications: Array}}
   */
  getApplicationData() {

    return {
      // Nome da aplicação Principal
      name: this.name,

      // Diretório RAIZ da aplicação principal
      rootPath: this.path,

      // Lista de aplicaçações, inclui aplicação principal e subaplicações
      applications: this.applications
    }

  }

  /**
   * Adiciona aplicação ao lista de aplicações
   *
   * @param path    {string}
   * @param name    {string}
   * @param id      {string}
   * @param options {object}
   * @private
   */
  _addApplication(path, name, id, options) {

    this.applications.push({
      name,
      path,
      id,
      options
    })

  }
}

module.exports = Application

