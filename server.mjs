import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, 'dist')
const port = process.env.PORT || 4173
const target = 'https://ai.t8star.org'

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

async function proxyRequest(req, res) {
  const url = new URL(req.url, target)
  const headers = { ...req.headers, host: url.host }
  delete headers['host']
  headers.host = url.host

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? await new Promise((resolve, reject) => {
        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', () => resolve(Buffer.concat(chunks)))
        req.on('error', reject)
      })
    : undefined

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body,
  })

  res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()))
  const buffer = Buffer.from(await upstream.arrayBuffer())
  res.end(buffer)
}

async function serveStatic(req, res) {
  let pathname = req.url?.split('?')[0] || '/'
  if (pathname === '/') pathname = '/index.html'

  const filePath = join(distDir, pathname)
  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) throw new Error('not a file')
    const content = await readFile(filePath)
    const ext = extname(filePath)
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
    res.end(content)
  } catch {
    const content = await readFile(join(distDir, 'index.html'))
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(content)
  }
}

createServer(async (req, res) => {
  if (req.url?.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '')
    await proxyRequest(req, res)
    return
  }
  await serveStatic(req, res)
}).listen(port, () => {
  console.log(`Image-2 生图页面: http://localhost:${port}`)
})
