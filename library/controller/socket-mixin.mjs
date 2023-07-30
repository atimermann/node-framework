/**
 * Created on 28/07/23
 *
 * library/controller/socket-mixin.mjs
 *
 * SocketMixin module
 *
 * @module socket-mixin
 * @author André Timermann <andre@timermann.com.br>
 *
 */
import createLogger from '../../library/logger.mjs'
const logger = createLogger('Controller')

export default class SocketMixin {
  /**
   * Holds the instance of the Socket.io server.
   *
   * @type {import("socket.io").Server}
   */
  io = undefined

  /**
   * Returns a namespace instance from the Socket.io server.
   *
   * @param {string} path  Path of the namespace
   * @returns {import("socket.io").Namespace} The namespace instance
   */
  namespace (path) {
    return this.io.of(path)
  }

  /**
   * Method that should be overridden by the user, implementing the application's logic.
   *
   * @async
   */
  async socket () {
    logger.debug(`Socket pre not implemented in ${this.completeIndentification}.`)
  }
}
