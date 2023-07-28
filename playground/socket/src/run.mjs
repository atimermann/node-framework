/**
 * **Created on 27/07/2023**
 *
 * run.mjs
 * @author André <a@b.com>
 *
 * socket
 *
 */

import { Server } from '@agtm/node-framework'
import socket from './main.mjs'

await Server.init(socket)
