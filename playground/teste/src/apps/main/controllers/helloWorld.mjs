/**
 * **Created on 04/07/2023**
 *
 * apps/main/controllers/helloWorld.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */
import { Controller, createLogger } from '@agtm/node-framework'

const logger = createLogger()

export default class HelloWorldController extends Controller {
  jobs () {
    logger.info('Configuring Jobs...')

    this.createJob('JOB SCHEDULE', '*/10 * * * * *', async () => {
      logger.info(' ===> SCHEDULE JOB')

      setInterval(() => {
      }, 1000000)
    })

    this.createJob('JOB NOW', 'now', async () => {
      logger.info('====> JOB NOW')
    })

    this.createJob('Job Concorrente', null, async () => {
      logger.info('Starting Worker...')

      setInterval(() => {
        const value = Math.random()
        if (value <= 0.01) {
          logger.error(`Sort number ${Math.round(value * 1000) / 1000}: SIMULATED ERROR - HANGOUT`)
          process.exit()
        } else {
          logger.info(`Sort number ${Math.round(value * 1000) / 1000}: OK`)
        }
      }, 1000)
    })

    this.createWorkers('Worker Y', 'Job Concorrente', {
      concurrency: 3 + 11
    })
  }
}
