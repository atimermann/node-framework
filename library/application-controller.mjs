/**
 * **Created on 16/11/18**
 *
 * src/library/application-controller.js
 * @author André Timermann <andre@timermann.com.br>
 *
 *   Objeto para Carregar, Controlar as Aplicações
 *
 *   TODO: Migrar para AsyncGenerator quando disponível no PKG, substituir os arrays por yelds e colocar * depois de async
 *
 */

import path from 'path'
import { readdir, access } from 'fs/promises'
import { logger } from './logger.js'

export default class ApplicationController {
  /**
   * Retorna todos os controladores da aplicação atual e define atributos sobre a aplicação atual
   *
   * @returns {Promise<Array>}
   */
  static async getControllers (applications) {
    const controllersInstances = []

    for (const application of applications) {
      logger.info(`Carregando aplicação '${application.name}'`)
      logger.debug(` APPLICATION NAME   : '${application.name}'`)
      logger.debug(` APPLICATION UUID     : '${application.uuid}'`)
      logger.debug(` APPLICATION PATH   : '${application.path}'`)

      await this.checkAppsDirectoryExist(application)

      for (const controllerInstance of await this._getControllersInstanceByApps(application.appsPath)) {
        // Define Atributos da Aplicação ao Controller
        controllerInstance.applicationName = application.name
        controllerInstance.applicationPath = application.path
        controllerInstance.applicationId = application.uuid

        controllersInstances.push(controllerInstance)
      }
    }

    return controllersInstances
  }

  /**
   * Retorna todos os controladores do app especificado
   *
   * @param appsPath  {string} Caminho físico do diretórios os os apps desta aplicação se encontra
   *
   * @returns {Promise<Array>} Lista de controllers já instanciado
   * @private
   */
  static async _getControllersInstanceByApps (appsPath) {
    const controllersInstances = []

    for (const appName of await readdir(appsPath)) {
      logger.info(`Carregando app '${appName}'`)

      const controllersPath = path.join(appsPath, appName, 'controllers')
      const appPath = path.join(appsPath, appName)

      logger.debug(` APP NAME   : '${appName}'`)
      logger.debug(` APP PATH   : '${appPath}'`)

      if (await this.exists(appsPath)) {
        for (const controllerInstance of await this._getControllersInstanceByControllers(controllersPath)) {
          // Define Atributos da app ao Controller
          controllerInstance.appName = appName
          controllerInstance.appPath = appPath

          controllersInstances.push(controllerInstance)
        }
      }
    }

    return controllersInstances
  }

  /**
   * Carrega e retorna todos os controladores definido no diretório 'Controllers'
   *
   * @param controllersPath     {string}  Diretório onde estão os controllers
   *
   * @returns {Promise<Array>}  Lista de controllers já instanciado
   * @private
   */
  static async _getControllersInstanceByControllers (controllersPath) {
    const controllersInstances = []

    for (const controllerName of await readdir(controllersPath)) {
      const controllerPath = path.join(controllersPath, controllerName)
      let Controller

      if (['.mjs', '.js'].includes(path.extname(controllerPath))) {
        logger.info(`Carregando controller '${path.basename(controllerName)}'`)
        logger.debug(` CONTROLLER NAME   : '${controllerName}'`)
        logger.debug(` CONTROLLER PATH   : '${controllerPath}'`)

        Controller = (await import(controllerPath)).default
        const controllerInstance = new Controller()
        controllerInstance.controllerName = path.basename(controllerName, path.extname(controllerPath))
        controllersInstances.push(controllerInstance)
      }
    }

    return controllersInstances
  }

  /**
   * Retorna Lista com todos os Assets do projeto incluindo dependencia
   *
   * @param applications  {array} Lista de aplicações
   *
   * @returns {Promise<Array>}
   */
  static async getAssets (applications) {
    const assets = []

    for (const application of applications) {
      const appsPath = path.join(application.path, 'apps')

      await this.checkAppsDirectoryExist(application)

      for (const asset of await this._getAssetsByApps(appsPath, application.name)) {
        assets.push(asset)
      }
    }

    return assets
  }

  /**
   * Retorna lista de todos os assets(arquivos estáticos) de um app
   *
   * Essa lista é composta por: caminho do arquivo, nome da aplicação e nome do app
   *
   * @param appsPath          {string}  Caminho do App
   * @param applicationName   {string}  Nome da aplicação
   *
   * @returns {Promise<Array>}
   *
   * @private
   */
  static async _getAssetsByApps (appsPath, applicationName) {
    const assets = []

    for (const appName of await readdir(appsPath)) {
      logger.debug(`Carregando assets do app: '${appName}'`)

      const assetsPath = path.join(appsPath, appName, 'assets')

      logger.debug(` APP NAME   : '${appName}'`)
      logger.debug(` ASSET PATH   : '${assetsPath}'`)

      if (await this.exists(assetsPath)) {
        const assetsFile = await readdir(assetsPath)

        for (const assetFile of assetsFile) {
          assets.push({
            filePath: path.join(assetsPath, assetFile),
            applicationName,
            appName
          })
        }
      }
    }

    return assets
  }

  // /**
  //  * Retorna informações sobre todos os apps de todas as aplicação carregadas
  //  *
  //  * @param applications    {string<Array>}  Lista de aplicações
  //  * @returns {Promise<Array>}
  //  */
  // static async getApps (applications) {
  //   const apps = []
  //
  //   for (const application of applications) {
  //     const appsPath = path.join(application.path, 'apps')
  //
  //     await this.checkAppsDirectoryExist(application)
  //
  //     for (const appName of await readdir(appsPath)) {
  //       apps.push({
  //         path: path.join(appsPath, appName),
  //         applicationName: application.name,
  //         appName
  //       })
  //     }
  //   }
  //
  //   return apps
  // }

  static async checkAppsDirectoryExist (application) {
    try {
      await access(application.appsPath)
    } catch (err) {
      throw new Error(`Directory "${application.appsPath}" not exists in application "${application.name}"`)
    }
  }

  /**
   * return directory existe
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
