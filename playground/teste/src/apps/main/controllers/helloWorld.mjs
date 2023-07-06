/**
 * **Created on 04/07/2023**
 *
 * apps/main/controllers/helloWorld.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */
import { Controller, logger } from '@agtm/node-framework'

export default class HelloWorldController extends Controller {
  jobs () {
    logger.info('Configuring your project...')

    this.createJob('Teste 1', '*/10 * * * * *', async () => {
      //console.log('[WorkerManager]', '==========================================================================>')
      //console.log('[WorkerManager]')
      //console.log('[WorkerManager]', '                               SCHEDULE JOB                                ')
      //console.log('[WorkerManager]')
      //console.log('[WorkerManager]', '==========================================================================>')

      // setInterval(() => {
      // }, 1000000)
    })

    this.createJob('Teste 2', 'now', async () => {
      //console.log('[WorkerManager]', '==========================================================================>')
      //console.log('[WorkerManager]')
      //console.log('[WorkerManager]', '                               JOB NOW                                      ')
      //console.log('[WorkerManager]')
      //console.log('[WorkerManager]', '==========================================================================>')
    })

    this.createJob('teste 3', null, async () => {
      //console.log('==========================================================================>')
      //console.log()
      //console.log('                               WORKER JOB                                      ')
      //console.log()
      //console.log('==========================================================================>')

      setInterval(() => {
        //console.log(`Child process PID: ${process.pid}`)

        if (Math.random() <= 0.05) {
          //console.log('ERROR - PROCESS EXIT')
          process.exit()
        }
      }, Math.floor(3000 + Math.random() * (1000)))

      setTimeout(() => {
        //console.log(`Child process PID: ${process.pid}`)
      }, 1000)
    })

    this.createWorkers('Worker Y', 'teste 3', {
      concurrency: 3
    })
  }
}
