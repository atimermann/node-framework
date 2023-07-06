/**
 * **Created on 04/07/2023**
 *
 * main.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * teste
 *
 */
import { dirname } from 'path'
import { pathToFileURL, fileURLToPath } from 'url'
import { Application } from '@agtm/node-framework'

const __dirname = dirname(fileURLToPath(import.meta.url))
const teste = new Application(__dirname, 'teste')

export default teste

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  throw new Error('This module should not be executed directly, use \'run.mjs\' instead.')
}
