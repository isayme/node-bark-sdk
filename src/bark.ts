import axios, { AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'
import { encrypt } from './aes'

interface CbcEncryptInfo {
  method: 'aes-128-cbc' | 'aes-192-cbc' | 'aes-256-cbc'
  // 128: 16字符；192: 24字符; 256: 32字符
  key: string
  iv: string
}

interface EcbEncryptInfo {
  method: 'aes-128-ecb' | 'aes-192-ecb' | 'aes-256-ecb'
  // 128: 16字符；192: 24字符; 256: 32字符
  key: string
  // ecb 不需要 iv
  iv?: null
}

interface ConstructorOptions {
  deviceKey: string
  url?: string
  encrypt?: CbcEncryptInfo | EcbEncryptInfo
  timeout?: number
  retries?: number
}

/**
 * 推送中断级别。
 * active：默认值，系统会立即亮屏显示通知
 * timeSensitive：时效性通知，可在专注状态下显示通知。
 * passive：仅将通知添加到通知列表，不会亮屏提醒。
 */
enum Level {
  Active = 'active',
  TimeSensitive = 'timeSensitive',
  Passive = 'passive',
}

/**
 * 可以为推送设置不同的铃声
 */
enum Sound {
  Alarm = 'alarm',
  Anticipate = 'anticipate',
  Bell = 'bell',
  Birdsong = 'birdsong',
  Bloom = 'bloom',
  Calypso = 'calypso',
  Chime = 'chime',
  Choo = 'choo',
  Descent = 'descent',
  Electronic = 'electronic',
  Fanfare = 'fanfare',
  Glass = 'glass',
  Gotosleep = 'gotosleep',
  Healthnotification = 'healthnotification',
  Horn = 'horn',
  Ladder = 'ladder',
  MailSent = 'mailsent',
  Minuet = 'minuet',
  Multiwayinvitation = 'multiwayinvitation',
  Newmail = 'newmail',
  Newsflash = 'newsflash',
  Noir = 'noir',
  Paymentsuccess = 'paymentsuccess',
  Shake = 'shake',
  Sherwoodforest = 'sherwoodforest',
  Silence = 'silence',
  Spell = 'spell',
  Suspense = 'suspense',
  Telegraph = 'telegraph',
  Tiptoes = 'tiptoes',
  Typewriters = 'typewriters',
  Update = 'update',
}

interface IBarkPushReq {
  /**
   * 推送标题
   */
  title?: string

  /**
   * 推送内容
   */
  body: string

  /**
   * 推送中断级别。
   */
  level?: Level

  /**
   * 推送角标，可以是任意数字
   */
  badge?: number

  /**
   * iOS14.5以下自动复制推送内容，iOS14.5以上需手动长按推送或下拉推送
   */
  autoCopy?: 1

  /**
   * 复制推送时，指定复制的内容，不传此参数将复制整个推送内容。
   */
  copy?: string

  /**
   * 可以为推送设置不同的铃声
   */
  sound?: Sound

  /**
   * 为推送设置自定义图标，设置的图标将替换默认Bark图标。
   * 图标会自动缓存在本机，相同的图标 URL 仅下载一次。
   */
  icon?: string

  /**
   * 对消息进行分组，推送将按group分组显示在通知中心中。
   * 也可在历史消息列表中选择查看不同的群组。
   */
  group?: string

  /**
   * 传 1 保存推送，传其他的不保存推送，不传按APP内设置来决定是否保存。
   */
  isArchive?: 1

  /**
   * 点击推送时，跳转的URL ，支持URL Scheme 和 Universal Link
   */
  url?: string
}

class Client {
  #url?: string
  #timeout: number
  #retries: number
  #encrypt?: CbcEncryptInfo | EcbEncryptInfo
  #axiosInstance: AxiosInstance

  constructor(opts: ConstructorOptions) {
    let deviceKey = opts.deviceKey

    let url = opts.url || 'https://api.day.app'
    url = url.replace(/\/*$/, '')
    this.#url = `${url}/${deviceKey}`

    this.#timeout = opts.timeout || 3000
    this.#retries = opts.retries || 10

    this.#encrypt = opts.encrypt

    this.#createAxiosInstance()
  }

  #createAxiosInstance() {
    let axiosInstance = axios.create({
      validateStatus: function (status: number) {
        return true
      },
    })
    this.#axiosInstance = axiosInstance
    axiosInstance.interceptors.request.use(function (request) {
      request.params = request.params || {}
      request.params['_'] = Date.now()

      return request
    })

    axiosRetry(axiosInstance, {
      retries: this.#retries,
      shouldResetTimeout: true,
      retryDelay: function () {
        return 1000
      },
      retryCondition: function (err) {
        if (axiosRetry.isNetworkOrIdempotentRequestError(err)) {
          return true
        }

        if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {
          return true
        }

        if (err.code === 'ETIMEDOUT') {
          return true
        }

        if (err.response && err.response.status >= 500) {
          return true
        }

        return false
      },
    })
  }

  request(body: object) {
    let data = body
    if (this.#encrypt) {
      let { method, key, iv } = this.#encrypt
      data = {
        ciphertext: encrypt(
          method,
          key,
          iv || null,
          JSON.stringify(body),
        ).toString('base64'),
      }
    }

    return this.#axiosInstance
      .request({
        method: 'POST',
        url: this.#url,
        timeout: this.#timeout,
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify(data),
      })
      .then((resp) => {
        let { code, message } = resp.data
        if (code !== 200) {
          throw new Error(
            `request bark fail, code '${code}', message '${message}'`,
          )
        }
      })
  }

  push(req: IBarkPushReq): Promise<void>
  push(body: string): Promise<void>
  push(title: string, body: string): Promise<void>
  push(arg1: string | IBarkPushReq, arg2?: string) {
    let req: IBarkPushReq = { body: 'No Content' }

    if (typeof arg1 === 'string' && typeof arg2 === 'string') {
      req.title = arg1
      req.body = arg2
    } else if (typeof arg1 === 'string') {
      req.body = arg1
    } else {
      req = arg1
    }

    return this.request(req)
  }
}

export { Client, ConstructorOptions, Level, Sound }
