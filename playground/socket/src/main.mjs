/**
 * **Created on 27/07/2023**
 *
 * main.mjs
 * @author André <a@b.com>
 *
 * socket
 *
 */
import { dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'
import { Application } from '@agtm/node-framework'

const __dirname = dirname(fileURLToPath(import.meta.url))
const socket = new Application(__dirname, 'socket')

export default socket

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  throw new Error('This module should not be executed directly, use \'run.mjs\' instead.')
}
