// Usado apelas pelo JEST para converter ESM para CommonJS

const path = require('path')

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ],
  plugins: [
    ['module-resolver', {
      alias: {
        '~': path.join(__dirname, 'src')
      }
    }]
  ]
}
