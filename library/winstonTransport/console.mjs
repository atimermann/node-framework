/**
 * **Created on 06/07/2023**
 *
 * /console.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * COLOR: https://misc.flogisoft.com/bash/tip_colors_and_formatting
 */

import Transport from 'winston-transport'
import { inspect } from 'node:util'

// Defining colors as constants
/**
 * @constant {string}
 */
const resetColor = '\x1b[0m'
/**
 * @constant {string}
 */
const blueDarkColor = '\x1b[1;94m'
/**
 * @constant {string}
 */
const greenColor = '\x1b[32m'
/**
 * @constant {string}
 */
const yellowColor = '\x1b[33m'
/**
 * @constant {string}
 */
const redColor = '\x1b[31m'
/**
 * @constant {string}
 */
const purpleColor = '\x1b[35m'

/**
 * @function
 * @param {number} level - The log level
 * @returns {string} - The corresponding color for the log level
 */
function getLevelColor (level) {
  switch (level) {
    case 'info': // INFO
      return greenColor
    case 'warn': // WARN
      return yellowColor
    case 'error': // ERROR
      return redColor
    default:
      return resetColor
  }
}

export default class Console2Transport extends Transport {
  constructor (opts) {
    super(opts)
    this.name = 'Console2Transport'
  }

  log (logObj, callback) {
    let { level, module, message } = logObj
    if (typeof message === 'object') {
      message = inspect(message)
    }

    const date = new Date()
    const levelColor = getLevelColor(level)
    const levelText = `${levelColor}${level.padEnd(5)}${resetColor}`
    const moduleText = module ? `${blueDarkColor}[ ${module} ]${resetColor}` : ''
    const msgColor = `${greenColor}${message}${resetColor}`
    const formattedTime = `${purpleColor}${date.toLocaleTimeString()}.${date.getMilliseconds()}${resetColor}`

    console.log(`${formattedTime} ${levelText} ${moduleText} ${msgColor}`)
    callback()
  }
}
