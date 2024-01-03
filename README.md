Node SDK for Bark (https://bark.day.app/)

# 特性

- 支持 Basic Auth；
- 支持加密推送；
- 自动重试, 默认 10 次；

# 快速使用

## 安装

```
npm install '@isayme/bark'
或
pnpm add '@isayme/bark'
```

## 引用模块

```
// CommonJS
const { Client } = require('@isayme/bark')

// ESM & Typescript
import { Client } from '@isayme/bark'
```

## 样例

```
let deviceKey = '你的 device key'

let client = new Client({
  deviceKey,
})

async function main() {
  await client.push('这是测试内容')
  await client.push('这是测试标题', '这是测试内容')
  await client.push({
    title: '这是测试标题',
    body: '这是测试内容',
  })
}

main()
```

# 相关文档

- [Bark 官方文档](https://bark.day.app/)
