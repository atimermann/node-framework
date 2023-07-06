/**
 * **Created on 06/07/2023**
 *
 * /console.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * COLOR: https://misc.flogisoft.com/bash/tip_colors_and_formatting
 */

// A transport is a module that exports a default function that returns a "writable stream":

import { Writable } from 'stream'

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
 * @param {object} options - Configuration options
 * @returns {Writable} - Writable stream object
 */
export default (options) => {
  return new Writable({
    objectMode: true,
    write: (chunk, encoding, callback) => {
      const lines = chunk.split('\n')
      lines.forEach((line) => {
        if (line) {
          const { time, level, module, msg } = JSON.parse(line)

          const date = new Date(time)
          const levelColor = getLevelColor(level)
          const levelText = `${levelColor}${getLevelText(level)}${resetColor}`
          const moduleText = module ? `${blueDarkColor}[ ${module} ]${resetColor}` : ''
          const msgColor = `${greenColor}${msg}${resetColor}`
          const formattedTime = `${purpleColor}${date.toLocaleTimeString()}.${date.getMilliseconds()}${resetColor}`

          console.log(`${formattedTime} ${levelText} ${moduleText} ${msgColor}`)
        }
      })
      callback()
    }
  })
}

/**
 * @function
 * @param {number} level - The log level
 * @returns {string} - The corresponding text for the log level
 */
function getLevelText (level) {
  if (level >= 90) {
    return 'ERROR'
  } else if (level >= 70) {
    return 'WARN'
  } else if (level >= 50) {
    return 'INFO'
  } else {
    return 'DEBUG'
  }
}

/**
 * @function
 * @param {number} level - The log level
 * @returns {string} - The corresponding color for the log level
 */
function getLevelColor (level) {
  switch (level) {
    case 30: // INFO
      return greenColor
    case 40: // WARN
      return yellowColor
    case 50: // ERROR
      return redColor
    default:
      return resetColor
  }
}
