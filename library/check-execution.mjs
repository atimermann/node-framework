/**
 * Created on 27/08/23
 *
 * /library/check-execution.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * Description: This module provides a function to check whether a module is being executed directly or imported.
 *
 */
import { pathToFileURL } from 'url'

/**
 * Checks if the module is being executed directly.
 *
 * @param {string} importMetaUrl - The import.meta.url of the module.
 * @throws {Error} - Throws an error if the module is being executed directly.
 */
export default function checkExecution (importMetaUrl) {
  if (importMetaUrl === pathToFileURL(process.argv[1]).href) {
    throw new Error('This module should not be executed directly, use \'run.mjs\' instead.')
  }
}
