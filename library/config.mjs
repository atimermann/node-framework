/**
 * Created on 06/07/2023
 *
 * /config.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import { config as dotenvConfig } from 'dotenv'
import yaml from 'js-yaml'

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import fs from 'fs'

import defaultsDeep from 'lodash/defaultsDeep.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenvConfig()

/**
 * Class representing a unified configuration handler.
 * Configuration settings can be loaded from various sources
 * including .env files, system environment variables,
 * and YAML files with prioritization among them.
 */
export default class Config {
  /** @type {Object} The merged configuration object. */
  static config = {}

  /**
   * Initialize the configuration object by loading and merging
   * configurations from various sources.
   */
  static init () {
    // Load default YAML config
    const defaultYamlConfig = yaml.load(fs.readFileSync(join(__dirname, '..', 'config.default.yaml'), 'utf8'))

    // Load the appropriate YAML config based on NODE_ENV
    const env = process.env.NODE_ENV || 'development'
    const envYamlConfig = yaml.load(fs.readFileSync(join(__dirname, '..', `config.${env}.yaml`), 'utf8'))

    // Merge defaultYaml, envYaml, process.env, and .env
    this.config = defaultsDeep(
      this._envToNestedObject(process.env),
      envYamlConfig,
      defaultYamlConfig
    )
  }

  /**
   * Get a configuration value by its key.
   * @param {string} key - The configuration key.
   * @param {string} [type] - The expected type of the configuration value.
   * @throws Will throw an error if the configuration key is not found.
   * @returns {*} The configuration value.
   */
  static get (key, type) {
    const parts = key.split('.')
    let current = this.config

    for (const part of parts) {
      if (current[part] === undefined) {
        throw new Error(`Config key "${key}" not found`)
      }
      current = current[part]
    }

    // Check for "__value" only at the end
    if (current.__value) {
      current = current.__value
    }

    // Convert to the specified type, if provided
    if (type !== undefined) {
      switch (type) {
        case 'number':
          return Number(current)
        case 'boolean':
          return typeof current === 'boolean' ? current : current.toLowerCase() === 'true'
        case 'string':
          return String(current)
        case 'array':
          return Array.isArray(current) ? current : current.split(':')
        default:
          throw new Error(`Unknown type "${type}"`)
      }
    }

    return current
  }

  /**
   * Check if a value is a plain object.
   * @param {*} obj - The value to check.
   * @returns {boolean} Returns true if the value is a plain object, else false.
   */
  static _isPlainObject (obj) {
    return Object.prototype.toString.call(obj) === '[object Object]'
  }

  /**
   * Convert an environment object into a nested configuration object.
   * @param {Object} env - The environment object.
   * @returns {Object} The nested configuration object.
   */
  static _envToNestedObject (env) {
    const result = {}

    for (const key in env) {
      const value = env[key]
      const parts = key.toLowerCase().split('_')
      const last = parts.pop()

      let current = result
      for (const part of parts) {
        if (current[part] !== undefined && !this._isPlainObject(current[part])) {
          current[part] = { __value: current[part] }
        } else if (!(part in current)) {
          current[part] = {}
        }
        current = current[part]
      }

      current[last] = value
    }

    return result
  }
}

Config.init()
