/**
 * **Created on 06/07/2023**
 *
 * /console.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * COLOR: https://misc.flogisoft.com/bash/tip_colors_and_formatting
 */

import Transport from 'winston-transport'

import BlessedInterface from '../blessed.mjs'

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
const yellowColor = '\x1b[33m'

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
      return '\x1b[39m'
    case 'warn': // WARN
      return yellowColor
    case 'error': // ERROR
      return '\x1b[31m'
    default:
      return resetColor
  }
}

export default class BlessedTransport extends Transport {
  constructor (opts) {
    super(opts)
    this.name = 'Console2Transport'
  }

  log (logObj, callback) {
    let { level, module, message } = logObj
    if (typeof message === 'object') {
      message = JSON.stringify(message)
    }

    const date = new Date()
    const levelColor = getLevelColor(level)
    const levelText = `${levelColor}${level}${resetColor}`
    const moduleText = module ? `${blueDarkColor}[${module}]${resetColor}` : ''
    const msgColor = `${levelColor}${message}${levelColor}`
    const formattedTime = `${purpleColor}${date.toLocaleTimeString()}.${date.getMilliseconds()}${resetColor}`

    BlessedInterface.log(`${formattedTime} ${levelText} ${moduleText} ${msgColor}`, module)
    callback()
  }
}
