import { Client, createClient } from 'oicq'
import { config } from 'src/config'
import { Sender } from 'src/model/sender'
import { BaseMessageHandler, MessageHandler } from 'src/types'
import logger from 'src/util/log'

let client: Client
let messageHandler: Array<MessageHandler | BaseMessageHandler>

export async function initOicq (initMessageHandler?: Array<MessageHandler | BaseMessageHandler>) {
  messageHandler = initMessageHandler ?? messageHandler ?? []
  await client?.logout()
  client = createClient(config.botQQ, {
    log_level: 'warn',
    data_dir: process.cwd() + '/data'
  })
  client.on('message', async e => {
    // 私信或at回复
    if (e.message_type === 'private' || e.atme) {
      const sender = new Sender(e)
      try {
        for (let i = 0; i < messageHandler.length; i++) {
          let isStop = false
          if (messageHandler[i] instanceof BaseMessageHandler) {
            isStop = !await (messageHandler[i] as BaseMessageHandler).handle(sender)
          } else if (typeof messageHandler[i] === 'function') {
            isStop = !await (messageHandler[i] as MessageHandler)(sender)
          }
          if (isStop) {
            return
          }
        }
      } catch (err) {
        logger.error(err)
        sender.reply(`发生错误: ${err}`)
      }
    }
  })

  client.on('system.online', () => {
    client.sendPrivateMsg(config.adminQQ, '已上线~')
  })

  doLogin(client)

  return client
}

function doLogin (client: Client) {
  // 有密码滑块登录（不好用，先搁置着）
  // if (config.password) {
  //   client.on('system.login.slider', function (e) {
  //     console.log('输入ticket：')
  //     process.stdin.once('data', ticket => this.submitSlider(String(ticket).trim()))
  //   }).login(config.password)
  //   client.on('system.login.device', function (e) {
  //     console.log('e.url', e.url)
  //   })
  // } else {
  client.on('system.login.qrcode', function (e) {
    // 扫码后按回车登录
    process.stdin.once('data', () => {
      this.login()
    })
  }).login()
  // }
}
