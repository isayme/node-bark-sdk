import { createCipheriv } from 'crypto'

export function encrypt(
  method: string,
  key: string,
  iv: string | null,
  payload: string,
) {
  let cipher = createCipheriv(method, key, iv)
  return Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
}
