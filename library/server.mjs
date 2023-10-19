/**
 * **Created on 09/20/18**
 *
 * src/library/server.js
 * @author André Timermann <andre@timermann.com.br>
 *
 *   Bootstrap, server execution
 *
 */

import Application from './application.mjs'
import HttpServer from './http-server.mjs'
import SocketServer from './socket-server.mjs'

import JobManager from './jobs/job-manager.mjs'
import WorkerRunner from './jobs/worker-runner.mjs'

import BlessedInterface from './blessed.mjs'
import Config from './config.mjs'
import os from 'os'

import figlet from 'figlet'
import { sentenceCase } from 'change-case'

import createLogger from './logger.mjs'
import { readFileSync } from 'fs'
import ResourceMonitor from './resource-monitor.mjs'
const logger = createLogger('Init')

export default {

  /**
   * Initializes the server.
   *
   * @param {function(Application): Application} applicationLoader - A function that receives the Application class and returns an instance of it.
   *
   * @throws {TypeError} If the provided applicationLoader does not return an instance of Application.
   * @throws {Error} If the jobManager is disabled when running in 'job' mode.
   *
   * @returns {void}
   */
  async init (applicationLoader) {
    try {
      const application = applicationLoader(Application)

      if (!(application instanceof Application)) {
        // noinspection ExceptionCaughtLocallyJS
        throw new TypeError('application must be instance of Application')
      }

      await application.init()

      if (process.argv[2] === 'job') {
        if (Config.get('jobManager.enabled', 'boolean')) {
          await WorkerRunner.run(application)
        } else {
          throw new Error('jobManager disabled')
        }
      } else {
        await this.initServer(application)
      }
    } catch (error) {
      console.error(error)
      process.exit()
    }
  },

  /**
   * Initializes Server
   *
   * @param {Application} application
   */
  async initServer (application) {
    if (Config.get('monitor.enabled', 'boolean')) {
      BlessedInterface.init()
    }

    if (Config.get('resourceMonitor.enabled', 'boolean')) {
      ResourceMonitor.init()
    }

    this.logInfo(application)

    // Order is important
    if (Config.get('httpServer.enabled', 'boolean')) {
      await HttpServer.run(application)
    }

    if (Config.get('httpServer.enabled', 'boolean')) {
      await JobManager.run(application)
    }

    if (Config.get('socket.enabled', 'boolean')) await SocketServer.run(application)
  },

  logInfo (application) {
    const filePath = new URL('../package.json', import.meta.url)
    const packageInfo = JSON.parse(readFileSync(filePath, 'utf8'))

    logger.info('\n' + figlet.textSync('Node Framework'))
    logger.info('\n' + figlet.textSync(`\n${sentenceCase(application.name)}`))
    logger.info('==============================================================')
    logger.info(`Project:                 ${application.name}`)
    logger.info(`Root Path:               ${application.path}`)
    logger.info(`Node Version:            ${process.version}`)
    logger.info(`Environment:             ${process.env.NODE_ENV}`)
    logger.info(`Pid:                     ${process.pid}`)
    logger.info(`Hostname:                ${os.hostname()}`)
    logger.info(`Platform:                ${os.platform()}`)
    logger.info(`Arch:                    ${os.arch()}`)
    logger.info(`Node Framework Version:  ${packageInfo.version}`)
    logger.info(`Application Version:     ${process.env.npm_package_version}`)
    logger.info('==============================================================')
  }
}
