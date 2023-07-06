/**
 * **Created on 04/07/2023**
 *
 * run.mjs
 * @author André Timermann <andre@timermann.com.br>
 *
 * teste
 *
 */

import { Server } from '@agtm/node-framework'
import teste from './main.mjs'

await Server.init(teste)
