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

class Application {

  /**
   * Instancia nova aplicação (app) Sindri
   *
   * @param path      Caminho da aplicação, deve utulizare __dirname
   * @param options   Lista de Opções da aplicação, as seguintes opções são obrigatórios: name
   */
  constructor(path, options) {


    if (!options.name) throw new Error('Attribute "name" not defined in the project')



    /**
     * Caminho da aplicação atual (Em módulos sempre usar __dirname)
     *
     * @type {string}
     */
    this.path = path


    /**
     * Nome que Identifica a aplicação
     * @type {string}
     */
    this.name = options.name

    console.log('Class Init:', path)

  }

  /**
   * Carrega uma Subaplicação
   *
   * @param application
   */
  loadAppplication(application) {

    console.log(`Carregando App '${application.name}'. Path: '${application.path}'`)
    
  }
}

module.exports = Application





