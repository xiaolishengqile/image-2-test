import { createServer } from 'node:http'

const port = Number(process.env.PORT) || 3000
const target = (process.env.TARGET_URL || 'https://ai.t8star.org').replace(/\/$/, '')
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

function getOrigin(req) {
  return req.headers.origin || req.headers.referer?.replace(/\/$/, '').split('/').slice(0, 3).join('/')
}

function isOriginAllowed(origin) {
  if (!origin) return allowedOrigins.includes('*')
  if (allowedOrigins.includes('*')) return true
  return allowedOrigins.some((allowed) => allowed === origin)
}

function setCorsHeaders(req, res) {
  const origin = getOrigin(req)
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function proxyRequest(req, res) {
  const pathname = req.url?.split('?')[0] || '/'
  const search = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const upstreamPath = pathname.replace(/^\/api/, '') || '/'
  const url = `${target}${upstreamPath}${search}`

  const headers = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    if (['host', 'connection', 'content-length', 'origin', 'referer'].includes(lower)) continue
    headers[key] = value
  }

  const body = await readBody(req)

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
    })

    const responseHeaders = {}
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return
      responseHeaders[key] = value
    })

    setCorsHeaders(req, res)
    res.writeHead(upstream.status, responseHeaders)
    res.end(Buffer.from(await upstream.arrayBuffer()))
  } catch (err) {
    setCorsHeaders(req, res)
    const message = err instanceof Error ? err.message : '代理请求失败'
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: { message: `代理错误: ${message}` } }))
  }
}

createServer(async (req, res) => {
  const pathname = req.url?.split('?')[0] || '/'

  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true, target }))
    return
  }

  if (pathname.startsWith('/api/')) {
    await proxyRequest(req, res)
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: { message: '仅支持 /api/* 代理路径' } }))
}).listen(port, '0.0.0.0', () => {
  console.log(`Image-2 代理已启动: http://0.0.0.0:${port}`)
  console.log(`上游地址: ${target}`)
  console.log(`允许来源: ${allowedOrigins.join(', ')}`)
})
