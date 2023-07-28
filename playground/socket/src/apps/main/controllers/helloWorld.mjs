/**
 * **Created on 27/07/2023**
 *
 * apps/main/controllers/helloWorld.mjs
 * @author André <a@b.com>
 *
 */
import { Controller } from '@agtm/node-framework'

export default class HelloWorldController extends Controller {
  socket () {
    this.namespace('/jobs').on('connection', socket => {
      socket.emit('newData', { nane: 'André' })
    })
  }
}
