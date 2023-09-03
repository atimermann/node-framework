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
import transform from 'lodash/transform.js'
import toLower from 'lodash/toLower.js'
import isPlainObject from 'lodash/isPlainObject.js'

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
    const env = process.env.NODE_ENV || 'development'

    // Load default YAML config
    const defaultYamlConfig = yaml.load(fs.readFileSync(join(__dirname, '..', 'config.default.yaml'), 'utf8'))

    // Load the appropriate YAML config based on NODE_ENV
    const envYamlConfig = yaml.load(fs.readFileSync(join(__dirname, '..', `config.${env}.yaml`), 'utf8'))

    // Load YAML config from user Project
    const userYamlConfig = yaml.load(fs.readFileSync(join(process.cwd(), 'config.default.yaml'), 'utf8'))

    // Load YAML config from user Project based on NODE_ENV
    const envUserYamlConfig = yaml.load(fs.readFileSync(join(process.cwd(), `config.${env}.yaml`), 'utf8'))

    this.yamlConfig = defaultsDeep(
      envUserYamlConfig,
      userYamlConfig,
      envYamlConfig,
      defaultYamlConfig
    )

    // Merge defaultYaml, envYaml, process.env, and .env
    this.config =
        defaultsDeep(
          this._transformToLowerKeys(this._envToNestedObject(process.env)),
          this._transformToLowerKeys(this.yamlConfig)
        )
  }

  /**
   * Returns configuration exclusively from yaml (ignores ENV) and keeps case
   *
   * @param key The configuration key.
   * @param type The expected type of the configuration value.
   * @returns {*}
   */
  static getYaml (key, type) {
    return this.get(key, type, true)
  }

  /**
   * Get a configuration value by its key.
   *
   * @param {string} key - The configuration key.
   * @param {string} [type] - The expected type of the configuration value: number, boolean, string, array
   * @param {boolean} yamlOnly  - Force load configuration from yaml configuration without losing case
   *
   * @throws Will throw an error if the configuration key is not found.
   * @returns {*} The configuration value.
   */
  static get (key, type, yamlOnly = false) {
    const parts = yamlOnly
      ? key.split('.')
      : key.toLowerCase().split('.')

    let current = yamlOnly
      ? this.yamlConfig
      : this.config

    for (const part of parts) {
      if (current[part] === undefined) {
        throw new Error(`Config key "${key}" not found`)
      }
      current = current[part]
    }

    // Check for "__value" only at the end
    if (current?.__value) {
      current = current.__value
    }

    // Convert to the specified type, if provided
    if (type !== undefined) {
      switch (type) {
        case 'number':
          return Number(current)
        case 'boolean':
          if (!['boolean', 'string'].includes(typeof current)) {
            throw new TypeError(`Attribute "${key}" must be of type boolean or string`)
          }
          return typeof current === 'boolean' ? current : current.toLowerCase() === 'true'
        case 'string':
          return String(current)
        case 'array':
          return Array.isArray(current)
            ? current
            : current?.split(':')
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

  /**
   * Transforms all keys of an object to lowercase.
   * If the object contains nested objects, the keys of those objects will also be transformed.
   *
   * @param {Object} obj - The object whose keys should be transformed.
   * @return {Object} A new object with all keys transformed to lowercase.
   *
   * @private
   */
  static _transformToLowerKeys (obj) {
    return transform(obj, (result, value, key) => {
      const newKey = toLower(key)

      result[newKey] = isPlainObject(value)
        ? this._transformToLowerKeys(value)
        : value
    })
  };
}

Config.init()
