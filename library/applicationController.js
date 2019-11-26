/**
 * **Created on 16/11/18**
 *
 * src/library/applicationController.js
 * @author André Timermann <andre.timermann@smarti.io>
 *
 *   Objeto para Carregar, Controlar as Aplicações
 *
 *   TODO: Migrar para AsyncGenerator quando disponível no PKG, substituir os arrays por yelds e colocar * depois de async
 *
 */
'use strict'

const path = require('path')
const fs = require('fs-extra')
const {logger} = require('./logger')

module.exports = {

  /**
   * Retorna Lista com todos os Assets do projeto incluindo dependencia
   *
   * @param applications  {array} Lista de aplicações
   *
   * @returns {Promise<Array>}
   */
  async getAssets(applications) {

    let assets = []

    for (let application of applications) {

      let appsPath = path.join(application.path, 'apps')

      if (!await fs.pathExists(appsPath)) {
        throw new Error(`Directory 'apps' not exists in application '${application.name}'`)
      }

      for (let asset of await this._getAssetsByApps(appsPath, application.name)) {
        assets.push(asset)
      }

    }

    return assets

  },

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
  async _getAssetsByApps(appsPath, applicationName) {

    let assets = []

    for (let appName of await fs.readdir(appsPath)) {

      logger.debug(`Carregando assets do app: '${appName}'`)

      let assetsPath = path.join(appsPath, appName, 'assets')

      logger.debug(` APP NAME   : '${appName}'`)
      logger.debug(` ASSET PATH   : '${assetsPath}'`)

      if (await fs.pathExists(assetsPath)) {

        let assetsFile = await fs.readdir(assetsPath)

        for (let assetFile of assetsFile) {
          assets.push({
            filePath: path.join(assetsPath, assetFile),
            applicationName,
            appName
          })
        }

      }

    }

    return assets

  },

  /**
   * Retorna informações sobre todos os apps de todas as aplicação carregadas
   *
   * @param applications    {string<Array>}  Lista de aplicações
   * @returns {Promise<Array>}
   */
  async getApps(applications) {

    let apps = []

    for (let application of applications) {

      let appsPath = path.join(application.path, 'apps')

      if (!await fs.pathExists(appsPath)) {
        throw new Error(`Directory 'apps' not exists in application '${application.name}'`)
      }

      for (let appName of await fs.readdir(appsPath)) {
        apps.push({
          path: path.join(appsPath, appName),
          applicationName: application.name,
          appName
        })
      }

    }

    return apps
  },

  /**
   * Retorna todos os controladores da aplicação atual e define atributos sobre a aplicação atual
   *
   * @param applications    {string}  Diretório da aplicação atual
   *
   *
   * @returns {Promise<Array>}
   */
  async getControllers(applications) {

    let controllersInstances = []

    for (let application of applications) {

      logger.info(`Carregando aplicação '${application.name}'`)
      logger.debug(` APPLICATION NAME   : '${application.name}'`)
      logger.debug(` APPLICATION ID     : '${application.id}'`)
      logger.debug(` APPLICATION PATH   : '${application.path}'`)
      logger.debug(` APPLICATION OPTIONS: '${JSON.stringify(application.options)}'`)

      let appsPath = path.join(application.path, 'apps')

      if (!await fs.pathExists(appsPath)) {
        throw new Error(`Directory 'apps' not exists in application '${application.name}'`)
      }

      for (let controllerInstance of await this._getControllersInstanceByApps(appsPath)) {

        // Define Atributos da Aplicação ao Controller
        controllerInstance.applicationName = application.name
        controllerInstance.applicationPath = application.path
        controllerInstance.applicationId = application.id
        controllerInstance.options = application.options

        controllersInstances.push(controllerInstance)

      }

    }

    return controllersInstances
  },

  /**
   * Retorna todos os controladores do app especificado
   *
   * @param appsPath  {string} Caminho físico do diretórios os os apps desta aplicação se encontra
   *
   * @returns {Promise<Array>} Lista de controllers já instanciado
   * @private
   */
  async _getControllersInstanceByApps(appsPath) {

    let controllersInstances = []

    for (let appName of await fs.readdir(appsPath)) {

      logger.info(`Carregando app '${appName}'`)

      let controllersPath = path.join(appsPath, appName, 'controllers')
      let appPath = path.join(appsPath, appName)

      logger.debug(` APP NAME   : '${appName}'`)
      logger.debug(` APP PATH   : '${appPath}'`)

      if (await fs.pathExists(controllersPath)) {

        for (let controllerInstance of await this._getControllersInstanceByControllers(controllersPath)) {

          // Define Atributos da app ao Controller
          controllerInstance.appName = appName
          controllerInstance.appPath = appPath

          controllersInstances.push(controllerInstance)
        }

      }

    }

    return controllersInstances

  },

  /**
   * Carrega e retorna todos os controladores definido no diretório 'Controllers'
   *
   * @param controllersPath     {string}  Diretório onde estão os controllers
   *
   * @returns {Promise<Array>}  Lista de controllers já instanciado
   * @private
   */
  async _getControllersInstanceByControllers(controllersPath) {

    let controllersInstances = []

    for (let controllerName of await fs.readdir(controllersPath)) {

      let controllerPath = path.join(controllersPath, controllerName)

      logger.info(`Carregando controller '${path.basename(controllerName, '.js')}'`)
      logger.debug(` CONTROLLER NAME   : '${controllerName}'`)
      logger.debug(` CONTROLLER PATH   : '${controllerPath}'`)

      let Controller = require(controllerPath)

      let controllerInstance = new Controller()
      controllerInstance.controllerName = path.basename(controllerName, '.js')

      controllersInstances.push(controllerInstance)
    }

    return controllersInstances

  }

}
