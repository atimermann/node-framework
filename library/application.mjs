/**
 * src/library/application.js
 * @author André Timermann
 *
 * This class represents an application in the framework.
 * A new instance of it will always be created in a new project.
 * An Application can load other applications or be loaded by other applications,
 * enabling reusability.
 *
 * @created 20/09/2018
 * @updated 29/06/2023
 */

import { logger } from './logger.js'
import assert from 'node:assert'
import ApplicationController from './application-controller.mjs'
import path from 'path'

export default class Application {
  /**
   * Stores a list of loaded applications , include self
   * @type {Array}
   */
  applications = []

  /**
   * Lista de instancia de controllers
   * @type {[]}
   */
  controllers = []

  /**
   * A unique identifier for the application
   */
  uuid = Date.now() + '-' + Math.random().toString(36).substr(2, 9)

  /**
   * indica que apliacação já foi inicializada
   * @type {boolean}
   */
  initialized = false

  /**
   * The constructor of the Application class.
   * @param {string} applicationPath - The physical path of the application. This should be defined using __dirname.
   * @param {string} name - The name of the application that will be loaded. This is mandatory.
   * @throws {Error} Will throw an error if the path or name parameters are not provided or not of type 'string'.
   */
  constructor (applicationPath, name) {
    logger.info(`Instantiating application '${name}'...`)

    assert(name, 'Attribute "name" is required!')
    assert(name, 'Attribute "path" is required!')

    if (typeof name !== 'string') throw new TypeError('Attribute "name" must be string! ' + name)
    if (typeof applicationPath !== 'string') throw new TypeError('Attribute "path" must be string! ' + applicationPath)

    /**
     * The name of the Application
     * @type {string}
     */
    this.name = name

    /**
     * The path of this Application
     * @type {string}
     */
    this.path = applicationPath

    /**
     * The path of apps in this application
     */
    this.appsPath = path.join(applicationPath, 'apps')

    // Adiciona sigo mesmo  na lista de aplicações
    this.applications.push(this)
  }

  /**
   * Loads a sub-application (a dependency of the main application)
   * @param {Application} application - An instance of the Application class
   * @throws {TypeError} Will throw an error if the provided application is not an instance of Application.
   */
  loadAppplication (application) {
    if (!(application instanceof Application)) {
      throw new TypeError('application must be an instance of Application')
    }

    if (this.initialized) {
      throw Error('It is no longer possible to add subapplications, the application has already been initialized.')
    }

    logger.info(`Loading App '${application.name}'. Path: '${application.path}'`)

    for (const definedApplcation of application.applications) {
      this.applications.push(definedApplcation)
    }
  }

  /**
   * Inicializa aplicação, não permite mais carregar subaplicação
   */
  async init () {
    this.controllers = await ApplicationController.getControllers(this.applications)

    if (this.controllers.length === 0) {
      throw new Error('No controller loaded')
    }
    this.initialized = true
  }

  getControllers () {
    return this.controllers
  }
}
