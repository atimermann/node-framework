import blessed from 'blessed'
import contrib from 'blessed-contrib'

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

  static ready = false

  static init () {
    // Create a screen
    this.screen = blessed.screen({
      smartCSR: true
    })

    this.screen.key(['q', 'C-c'], (ch, key) => {
      return process.exit(0)
    })

    this.render()

    this.ready = true
  }

  static render () {
    this.screen.render()
  }

  static log (message, boxName) {
    if (!this.ready) return

    if (!this.indexedBoxes[boxName]) {
      this.createBox(boxName)
    }

    const box = this.indexedBoxes[boxName]
    if (box) {
      box.insertBottom(message)
      box.setScrollPerc(100) // Auto scroll to bottom
      // this.render()
    } else {
      console.error('Box index out of bounds')
    }
  }

  static createBox (boxName) {
    const newBox = contrib.log({
      top: '0',
      left: '0',
      width: '50%',
      height: '50%',
      label: boxName,
      border: {
        type: 'line'
      },
      scrollable: true
    })

    this.boxes.push(newBox)
    this.indexedBoxes[boxName] = newBox
    this.screen.append(newBox)
    this.resizeBoxes()
    this.render()
  }

  static resizeBoxes () {
    const boxCount = this.boxes.length
    const cols = Math.ceil(Math.sqrt(boxCount))
    const rows = Math.ceil(boxCount / cols)

    this.boxes.forEach((box, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      box.top = `${(row * 100) / rows}%`
      box.left = `${(col * 100) / cols}%`
      box.width = `${100 / cols}%`
      box.height = `${100 / rows}%`
    })
  }
}
