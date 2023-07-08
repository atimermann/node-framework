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
      logger.info(`Entering application '${application.name}'`)

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
      logger.info(`Entering App '${appName}'`)

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
      let Controller

      if (['.mjs', '.js'].includes(path.extname(controllerPath))) {
        logger.info(`Loading controller '${path.basename(controllerName)}'`)

        Controller = (await import(controllerPath)).default
        const controllerInstance = new Controller()
        controllerInstance.controllerName = path.basename(controllerName, path.extname(controllerPath))
        controllersInstances.push(controllerInstance)
      }
    }

    return controllersInstances
  }

  // TODO: Parece q não é utilizado em lugar nenhum remover
  //
  // /**
  //  * Returns a list with all assets of the project including dependencies
  //  *
  //  * @param applications  {array} List of applications
  //  *
  //  * @returns {Promise<Array>}
  //  */
  // static async getAssets (applications) {
  //   const assets = []
  //
  //   for (const application of applications) {
  //     const appsPath = path.join(application.path, 'apps')
  //
  //     await this.checkAppsDirectoryExist(application)
  //
  //     for (const asset of await this._getAssetsByApps(appsPath, application.name)) {
  //       assets.push(asset)
  //     }
  //   }
  //
  //   return assets
  // }

  // // TODO: Parece q não é utilizado em lugar nenhum remover
  //
  // /**
  //  * Returns a list of all assets (static files) from an app
  //  *
  //  * This list is made up of: file path, application name, and app name
  //  *
  //  * @param appsPath          {string}  App path
  //  * @param applicationName   {string}  Application name
  //  *
  //  * @returns {Promise<Array>}
  //  *
  //  * @private
  //  */
  // static async _getAssetsByApps (appsPath, applicationName) {
  //   const assets = []
  //
  //   for (const appName of await readdir(appsPath)) {
  //     logger.debug(`Loading assets from app: '${appName}'`)
  //
  //     const assetsPath = path.join(appsPath, appName, 'assets')
  //
  //     logger.debug(` APP NAME   : '${appName}'`)
  //     logger.debug(` ASSET PATH   : '${assetsPath}'`)
  //
  //     if (await this.exists(assetsPath)) {
  //       const assetsFile = await readdir(assetsPath)
  //
  //       for (const assetFile of assetsFile) {
  //         assets.push({
  //           filePath: path.join(assetsPath, assetFile),
  //           applicationName,
  //           appName
  //         })
  //       }
  //     }
  //   }
  //
  //   return assets
  // }

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
