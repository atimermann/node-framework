import blessed from 'blessed'
import { filesize } from 'filesize'
import { io } from 'socket.io-client'
import Config from './config.mjs'

const RESET_COLOR = '\x1b[0m'
const BLUE_DARK_COLOR = '\x1b[1;94m'
const YELLOW_COLOR = '\x1b[33m'
const PURLE_COLOR = '\x1b[35m'

/**
 * Tamanho do historico diminuir se travando
 * @type {number}
 */
const LOG_HISTORY_SIZE = 20
/**
 * Intervalo de atualização dos logs, aumentar se travando
 * @type {number}
 */
const LOG_UPDATE_INTERVAL = 1000

/**
 * Created on 06/07/2023
 *
 * /blessed.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */
export default class BlessedInterface {
  static indexedBoxes = {}
  static boxes = []
  static activeBox = null
  static ready = false

  /**
   * Representa cada linha da caixa de log, será convertido para texto e será o conteudo do box
   * Indexado pelo nome do box
   * @type {{}}
   */
  static boxesLines = {}

  /**
   * Boxs para serem atualizados (quando tem novo log)
   * @type {{}}
   */
  static boxesForUpdate = {}

  /**
   * Initializes the application. This function prepares the screen, sets shortcuts and creates a status bar.
   *
   * @static
   */
  static init () {
    this.screen = blessed.screen({
      smartCSR: true,
      log: 'log.txt',
      fullUnicode: true,
      dockBorders: true,
      ignoreDockContrast: true
    })

    this.screen.on('resize', () => {
      this._resizeBoxes(null, -2)
    })

    this._setShortcuts()

    this._createStatusBar()
    this.screen.render()
    this.ready = true

    this.connectSocketServer()

    setInterval(() => this._updateLogs(), LOG_UPDATE_INTERVAL)
  }

  /**
   * Connect to socket server
   */
  static connectSocketServer () {
    const socketAddress = Config.get('monitor.socketServer')

    this.log(`Establishing connection to the log server: ${socketAddress}...`, 'Monitor')
    const socketLoggerClient = io(socketAddress)

    socketLoggerClient.on('connect', () => {
      this.log('Connected!', 'Monitor')
    })

    socketLoggerClient.on('disconnect', reason => {
      this.log('Disconnected from the log server.', 'Monitor')
      this.log(`Socket id: "${socketLoggerClient.id}"`, 'Monitor')
      this.log(`Reason: "${reason}"`, 'Monitor')
    })

    socketLoggerClient.on('connect_error', error => {
      this.log('Error connecting to the log server', 'Monitor')
      this.log(error.message, 'Monitor')
      this.log('Tip: Check if the socket server and the socket transport are active.', 'Monitor')
    })

    socketLoggerClient.on('log', logObj => {
      const { message, module } = this._parselogObj(logObj)
      this.log(message, module)
    })
  }

  static _getLevelColor (level) {
    switch (level) {
      case 'info': // INFO
        return '\x1b[39m'
      case 'warn': // WARN
        return YELLOW_COLOR
      case 'error': // ERROR
        return '\x1b[31m'
      case 'debug': // ERROR
        return '\x1b[92m'
      default:
        return RESET_COLOR
    }
  }

  /**
   * Formatting raw message received from the server
   *
   * @param logObj
   * @returns {string}
   */
  static _parselogObj (logObj) {
    const { level, module, message } = logObj

    const date = new Date()
    const levelColor = this._getLevelColor(level)
    const levelText = `${levelColor}${level.padEnd(5)}${RESET_COLOR}`
    const moduleText = module ? `${BLUE_DARK_COLOR}[${module}]${RESET_COLOR}` : ''
    const msgColor = `${levelColor}${message}${levelColor}`
    const formattedTime = `${PURLE_COLOR}${date.toLocaleTimeString()}.${date.getMilliseconds()}${RESET_COLOR}`

    return {
      message: `${formattedTime} ${levelText} ${moduleText} ${msgColor}`,
      module
    }
  }

  /**
   * Adds a message to the specified box. If the box does not exist, it creates a new box.
   *
   * @param {string} message - The message to add to the box.
   * @param {string} boxName - The name of the box to add the message to.
   * @static
   */
  static log (message, boxName) {
    if (!this.ready) return

    if (!this.indexedBoxes[boxName]) {
      this._createBox(boxName)
    }

    if (!this.boxesLines[boxName]) {
      this.boxesLines[boxName] = []
    }

    // indica q o box precisa ser atualizado
    this.boxesForUpdate[boxName] = true

    const box = this.indexedBoxes[boxName]
    const boxLines = this.boxesLines[boxName]
    if (box) {
      if (boxLines.length >= LOG_HISTORY_SIZE) {
        boxLines.shift()
      }
      boxLines.push(message)
    } else {
      console.error(`Box "${boxName}" not found!`)
    }
  }

  static _updateLogs () {
    for (const boxName of Object.keys(this.indexedBoxes)) {
      if (this.boxesForUpdate[boxName]) {
        this.indexedBoxes[boxName].setContent(this.boxesLines[boxName].join('\n'))
        delete this.boxesForUpdate[boxName]
      }
    }
  }

  /**
   * Sets application shortcuts.
   *
   * @private
   * @static
   */
  static _setShortcuts () {
    this.screen.key(['q', 'C-c'], () => process.exit(0)) // Close application
    this.screen.key(['r'], () => process.exit(12)) // Reboot application
    this.screen.key('C-right', () => this._moveBoxFocusTo('right'))
    this.screen.key('C-left', () => this._moveBoxFocusTo('left'))
    this.screen.key('C-down', () => this._moveBoxFocusTo('down'))
    this.screen.key('C-up', () => this._moveBoxFocusTo('up'))
  }

  /**
   * Creates a status bar at the bottom of the screen.
   *
   * @private
   * @param {string} boxName - Name of the box to which the status bar will be added.
   * @static
   */
  static _createStatusBar (boxName) {
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: 'This box has no border',
      border: {
        type: 'line',
        style: {
          border: 'white'
        }
      }
    })
    this.screen.append(this.statusBar)

    const helpText = '(q) quit, (r) restart, (ctrl+[up|down|left|right] switch box, (up|down) scroll text'
    const help = blessed.text({
      height: 1,
      width: helpText.length,
      content: helpText
    })

    this.applicationInfo = blessed.text({
      height: 1,
      right: 1

    })

    this.statusBar.append(help)
    this.statusBar.append(this.applicationInfo)

    setInterval(() => {
      this.applicationInfo.setContent(`Memory: ${filesize(process.memoryUsage().rss)}`)
    }, 1000)
  }

  /**
   * Creates a box on the screen with the specified name.
   *
   * @private
   * @param {string} boxName - The name of the box to create.
   * @static
   */
  static _createBox (boxName) {
    const newBox = blessed.log({
      mouse: false,
      keys: true,
      scrollbar: {
        ch: ' ',
        inverse: true
      },
      top: '0',
      left: '0',
      width: '50%',
      height: '50%',
      label: boxName,
      border: {
        type: 'line',
        style: {
          border: 'white'
        }
      },
      scrollable: true
    })

    newBox.on('focus', () => {
      newBox.style.border.fg = 'cyan'
      newBox.setScrollPerc(100)
      this.screen.render()
    })

    newBox.on('blur', () => {
      newBox.style.border.fg = 'white'
      newBox.setScrollPerc(100)
      this.screen.render()
    })

    this.boxes.push(newBox)
    this.indexedBoxes[boxName] = newBox
    this.screen.append(newBox)
    this._resizeBoxes(null, -2)

    this.screen.render()
  }

  /**
   * Resizes all boxes according to the screen size and given custom dimensions and offsets.
   *
   * @private
   * @param {number} customWidth - Custom width for the boxes. If negative, it's subtracted from screen width.
   * @param {number} customHeight - Custom height for the boxes. If negative, it's subtracted from screen height.
   * @param {number} offsetWidth - The amount of space left on the sides of the boxes.
   * @param {number} offsetHeight - The amount of space left on top and bottom of the boxes.
   * @static
   */
  static _resizeBoxes (customWidth, customHeight, offsetWidth = 0, offsetHeight = 0) {
    const boxCount = this.boxes.length
    const cols = Math.ceil(Math.sqrt(boxCount))
    const rows = Math.ceil(boxCount / cols)

    const screenWidth = customWidth < 0
      ? this.screen.width + customWidth - offsetWidth // Subtract offsetWidth if customWidth is negative
      : customWidth || this.screen.width - offsetWidth // Subtract offsetWidth

    const screenHeight = customHeight < 0
      ? this.screen.height + customHeight - offsetHeight // Subtract offsetHeight if customHeight is negative
      : customHeight || this.screen.height - offsetHeight // Subtract offsetHeight

    this.boxes.forEach((box, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      box.top = Math.floor((row * screenHeight) / rows) + offsetHeight // Add offsetHeight to the box's top position
      box.left = Math.floor((col * screenWidth) / cols) + offsetWidth // Add offsetWidth to the box's left position
      box.width = Math.floor(screenWidth / cols)
      box.height = Math.floor(screenHeight / rows)
    })
  }

  /**
   * Moves focus to a specific direction. If there are no boxes in the direction, nothing happens.
   *
   * @private
   * @param {string} direction - The direction to move the focus to. Can be 'up', 'down', 'left', 'right'.
   * @static
   */
  static _moveBoxFocusTo (direction) {
    if (!this.activeBox && this.boxes.length > 0) {
      this.activeBox = this.boxes[0]
      this.activeBox.focus()
      return
    }

    // Get the list of boxes that are on the same row as the active box.
    let sameAxieBoxes = this.boxes.filter(box => {
      return ['left', 'right'].includes(direction)
        ? box.top === this.activeBox.top
        : box.left === this.activeBox.left
    })

    // Get Boxes from target direction
    sameAxieBoxes = sameAxieBoxes.filter(box => {
      switch (direction) {
        case 'right':
          return box.left > this.activeBox.left
        case 'left':
          return box.left < this.activeBox.left
        case 'up':
          return box.top < this.activeBox.top
        case 'down':
          return box.top > this.activeBox.top
        default:
          throw new Error('invalid Direction')
      }
    })

    // If there are no boxes to the right, do nothing.
    if (sameAxieBoxes.length === 0) return

    // Find the box that is closest to the right of the active box.
    // Set the next box as the active box.
    this.activeBox = sameAxieBoxes.reduce((closestBox, box) => {
      switch (direction) {
        case 'right':
          return (box.left < closestBox.left) ? box : closestBox
        case 'left':
          return (box.left > closestBox.left) ? box : closestBox
        case 'up':
          return (box.top > closestBox.top) ? box : closestBox
        case 'down':
          return (box.top < closestBox.top) ? box : closestBox
        default:
          throw new Error('invalid Direction')
      }
    })

    this.activeBox.focus()
  }
}
