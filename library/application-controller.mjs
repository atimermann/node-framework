/**
 * **Created on 16/11/18**
 *
 * src/library/application-controller.js
 * @author André Timermann <andre@timermann.com.br>
 *
 *   Object to load and control applications
 *
 *
 */

import path from 'path'
import { readdir, access } from 'fs/promises'

import Controller from './controller/controller.mjs'
import createLogger from './logger.mjs'
const logger = createLogger('ApplicationController')

export default class ApplicationController {
  /**
   * Returns all controllers of the current application and sets attributes about the current application
   *
   * @returns {Promise<Array>}
   */
  static async getControllersInstances (applications) {
    const controllersInstances = []

    for (const application of applications) {
      logger.debug(`Entering application '${application.name}'`)

      await this.checkAppsDirectoryExist(application)

      for (const controllerInstance of await this._getControllersInstanceByApps(application.appsPath)) {
        // Defines application attributes to the controller
        controllerInstance.applicationName = application.name
        controllerInstance.applicationPath = application.path
        controllerInstance.applicationId = application.uuid

        controllersInstances.push(controllerInstance)
      }
    }

    return controllersInstances
  }

  /**
   * Returns all controllers of the specified app
   *
   * @param appsPath  {string} Physical path of the directory where the apps of this application are located
   *
   * @returns {Promise<Array>} List of already instantiated controllers
   * @private
   */
  static async _getControllersInstanceByApps (appsPath) {
    const controllersInstances = []

    for (const appName of await readdir(appsPath)) {
      logger.debug(`Entering App '${appName}'`)

      const controllersPath = path.join(appsPath, appName, 'controllers')
      const appPath = path.join(appsPath, appName)

      if (await this.exists(appsPath)) {
        for (const controllerInstance of await this._getControllersInstanceByControllers(controllersPath)) {
          // Defines app attributes to the Controller
          controllerInstance.appName = appName
          controllerInstance.appPath = appPath

          controllersInstances.push(controllerInstance)
        }
      }
    }

    return controllersInstances
  }

  /**
   * Loads and returns all controllers defined in the 'Controllers' directory
   *
   * @param controllersPath     {string}  Directory where the controllers are located
   *
   * @returns {Promise<Array>}  List of already instantiated controllers
   * @private
   */
  static async _getControllersInstanceByControllers (controllersPath) {
    const controllersInstances = []

    for (const controllerName of await readdir(controllersPath)) {
      const controllerPath = path.join(controllersPath, controllerName)
      let TargetController

      if (['.mjs', '.js'].includes(path.extname(controllerPath))) {
        logger.debug(`Loading controller '${path.basename(controllerName)}'`)

        TargetController = (await import(controllerPath)).default
        const controllerInstance = new TargetController()

        if (!(controllerInstance instanceof Controller)) {
          throw new TypeError('Controller must be an instance of Controller. If you are importing a sub-application ' +
              'of a module, make sure that both are using the same version of the node-framework, you must use the same ' +
              `instance, import from the same file. Use ApplicationLoader! Controller incompatible in "${controllerPath}"!`)
        }

        controllerInstance.controllerName = path.basename(controllerName, path.extname(controllerPath))
        controllersInstances.push(controllerInstance)
      }
    }

    return controllersInstances
  }

  static async checkAppsDirectoryExist (application) {
    try {
      await access(application.appsPath)
    } catch (err) {
      throw new Error(`Directory "${application.appsPath}" does not exist in application "${application.name}"`)
    }
  }

  /**
   * returns if directory exists
   */
  static async exists (directoryPath) {
    try {
      await access(directoryPath)
      return true
    } catch (err) {
      return false
    }
  }
}
