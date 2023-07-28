/**
 * **Created on 27/07/23**
 *
 * /socket.test.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 */

import { io } from 'socket.io-client'
// import { fileURLToPath, pathToFileURL } from 'url'

describe('Socket Server', () => {
  let SocketServer

  beforeAll(async () => {
    // store original NODE_ENV
    const originalProcessEnv = process.env

    // Configuração via ENV
    process.env.SOCKET_MODE = 'standalone'
    process.env.SOCKET_PORT = '4001'

    // import the server dinamicamente
    SocketServer = (await import('../library/socket-server.mjs')).default

    // start server
    SocketServer.run()

    // restore original NODE_ENV
    process.env = originalProcessEnv
  })

  it('should allow a client to connect', (done) => {
    // create client
    const socketClient = io('http://localhost:4001')
    //
    socketClient.on('connect', () => {
      expect(socketClient.connected).toBe(true)
      socketClient.disconnect()
      done()
    })

    socketClient.on('connect_error', (err) => {
      // if there's an error, fail the test
      done(err)
    })
  })

  afterAll(() => {
    // stop the server after tests
    SocketServer.io.close()
  })
})
