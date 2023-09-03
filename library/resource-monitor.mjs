/**
 * Created on 02/09/23
 *
 * /library/resource-monitor.mjs
 *
 * @author André Timermann <andre@timermann.com.br>
 *
 * Lib responsible for monitoring application resources such as memory consumption, Event Listeners created, among others
 *
 */

import memwatch from '@airbnb/node-memwatch'
import v8 from 'v8'
import { filesize } from 'filesize'

import createLogger from './logger.mjs'
import Config from './config.mjs'
let logger

/**
 * ResourceMonitor Class
 * @class
 *
 * Monitoring application resources such as memory consumption, Event Listeners created, among others
 */
export default class ResourceMonitor {
  static enabled
  static hd
  static detailSizeLimit
  static detailNodesLimit
  static monitorInterval

  /**
   * Initialize the ResourceMonitor class
   * Fetches configurations and initializes the logger and static properties.
   *
   * @static
   */
  static init () {
    this.monitorInterval = Config.get('resourceMonitor.dumpMemory.dumpInterval', 'number')
    const enableMemoryDump = Config.get('resourceMonitor.dumpMemory.enabled', 'boolean')
    this.detailSizeLimit = Config.get('resourceMonitor.dumpMemory.detailSizeLimit', 'number')
    this.detailNodesLimit = Config.get('resourceMonitor.dumpMemory.detailNodesLimit', 'number')

    logger = createLogger('ResourceMonitor')
    logger.info('Initializing...')
    logger.info(`Monitor Interval (min): ${this.monitorInterval}`)
    logger.info(`Size limit:             ${filesize(this.detailSizeLimit)}`)
    logger.info(`Nodes limit):           ${this.detailNodesLimit}`)

    if (enableMemoryDump) this._initMemoryDump()
  }

  /**
   * Initialize memory dumping
   * Sets an interval to call the dumpMemory method every monitorInterval minutes.
   * @static
   * @private
   */
  static _initMemoryDump () {
    logger.info('Dumping memory...')
    this.hd = new memwatch.HeapDiff()
    setInterval(() => {
      this._dumpMemory()
    }, Math.ceil(this.monitorInterval) * 60000)
  }

  /**
   * Get memory information
   * Collects heap statistics and returns an object containing detailed information.
   * @static
   * @returns {Object|null} Object containing memory statistics or null if monitoring is not enabled.
   */
  static getMemoryInfo () {
    if (this.enabled === undefined) this.enabled = Config.get('resourceMonitor.enabled', 'boolean')

    if (this.enabled) {
      const heapData = v8.getHeapStatistics()
      return {
        memoryAllocated: filesize(heapData.total_heap_size),
        memoryUsed: filesize(heapData.used_heap_size),
        memoryLimit: filesize(heapData.heap_size_limit),
        memoryUsedPercent: `${((heapData.total_heap_size / heapData.heap_size_limit) * 100).toFixed(1)}%`
      }
    }
  }

  /**
   * Perform memory dumping
   * Analyzes heap differences since the last dump and logs the changes.
   * @static
   * @private
   */
  static _dumpMemory () {
    logger.info('Dumping memory...')
    const diff = this.hd.end()
    delete this.hd
    this.hd = new memwatch.HeapDiff()

    logger.info(`Total memory allocated: "${diff.change.size}" Freed Nnodes: "${diff.change.freed_nodes}" Allocated nodes: "${diff.change.allocated_nodes}"`)
    diff.change.details
      .filter(detail => {
        if (detail.size_bytes > this.detailSizeLimit) return true
        return detail['+'] - detail['-'] > this.detailNodesLimit
      })
      .sort((a, b) => {
        if (a.size_bytes > b.size_bytes) return -1
        if (a.size_bytes < b.size_bytes) return 1
        return 0
      })
      .forEach(detail => {
        logger.info(`${(detail.what + ':').padEnd(30)} Allocation: ${String(detail['+'] - detail['-']).padStart(6)}        Size: ${detail.size.padStart(12)}`)
      })
  }
}
