/// <reference types="vitest/config" />
import https from 'https'
import http from 'http'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/** Maps a filename extension to a video MIME type. */
function videoMimeFromDisposition(disposition: string): string | null {
  const m = disposition.match(/filename[^;=\n]*=\s*["']?([^"';\n]+)["']?/)
  if (!m) return null
  const ext = m[1].trim().split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    mp4: 'video/mp4', m4v: 'video/mp4', m4p: 'video/mp4',
    mov: 'video/quicktime', qt: 'video/quicktime',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    ogv: 'video/ogg', ogg: 'video/ogg',
  }
  return map[ext ?? ''] ?? null
}

/**
 * Google Drive sometimes returns a 200 OK with Content-Type: text/html for
 * large files (virus-scan confirmation page) instead of the actual video.
 * This function parses that HTML to find the real download URL so the proxy
 * can retry with it.
 */
function extractConfirmedDownloadUrl(html: string): string | null {
  // Newer format: direct href to drive.usercontent.google.com
  const ucontentHref = html.match(
    /href="(https:\/\/drive\.usercontent\.google\.com\/download\?[^"]+)"/,
  )
  if (ucontentHref) {
    return ucontentHref[1].replace(/&amp;/g, '&')
  }

  // Newer form-based: extract action + uuid hidden input
  const formActionMatch = html.match(
    /action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]*)"/,
  )
  if (formActionMatch) {
    const uuidMatch =
      html.match(/name="uuid"[^>]*value="([^"]+)"/) ??
      html.match(/value="([^"]+)"[^>]*name="uuid"/)
    const idMatch =
      html.match(/name="id"[^>]*value="([^"]+)"/) ??
      html.match(/value="([^"]+)"[^>]*name="id"/)
    if (uuidMatch && idMatch) {
      const base = formActionMatch[1].replace(/&amp;/g, '&')
      const u = new URL(base.includes('?') ? base : `${base}?_=1`)
      u.searchParams.set('id', idMatch[1])
      u.searchParams.set('export', 'download')
      u.searchParams.set('confirm', 't')
      u.searchParams.set('uuid', uuidMatch[1])
      u.searchParams.delete('_')
      return u.toString()
    }
  }

  // Older format: /uc?export=download... link with confirm token
  const ucHref = html.match(/href="(\/uc\?[^"]*export=download[^"]+)"/)
  if (ucHref) {
    return 'https://drive.google.com' + ucHref[1].replace(/&amp;/g, '&')
  }

  return null
}

/**
 * Proxy /api/gdrive/* → https://drive.google.com/* with manual redirect
 * following. Vite's built-in proxy (http-proxy) passes 302s straight to the
 * browser, which then fetches googleusercontent.com directly — a cross-origin
 * resource that has no CORP header, so COEP blocks it. This plugin follows
 * every redirect on the server side so the browser only ever talks to
 * localhost, satisfying COEP without needing CORP headers on Google's CDN.
 */
function googleDriveProxyPlugin(): Plugin {
  return {
    name: 'google-drive-proxy',
    configureServer(server) {
      server.middlewares.use('/api/gdrive', (req, res) => {
        // req.url here is the path after the mount point, e.g. /uc?export=download&id=…
        const targetUrl = `https://drive.google.com${req.url ?? '/'}`

        function followRedirects(url: string, remaining: number): void {
          if (remaining <= 0) {
            res.writeHead(508, { 'Content-Type': 'text/plain' })
            res.end('Too many redirects')
            return
          }

          const parsed = new URL(url)
          const client = parsed.protocol === 'https:' ? https : http

          const upstreamReq = client.request(
            {
              hostname: parsed.hostname,
              path: parsed.pathname + parsed.search,
              method: req.method ?? 'GET',
              headers: {
                'user-agent': 'Mozilla/5.0',
                // Forward Range so video seeking works end-to-end
                ...(req.headers.range ? { range: req.headers.range } : {}),
              },
            },
            (upstreamRes) => {
              const { statusCode = 200, headers } = upstreamRes

              if (
                [301, 302, 303, 307, 308].includes(statusCode) &&
                headers.location
              ) {
                upstreamRes.resume() // drain before closing socket
                const next = headers.location.startsWith('http')
                  ? headers.location
                  : new URL(headers.location, url).href
                followRedirects(next, remaining - 1)
                return
              }

              // Google Drive returns HTML for the virus-scan warning page on
              // large files. Buffer it, extract the real download URL, and retry.
              if ((headers['content-type'] ?? '').includes('text/html')) {
                const chunks: Buffer[] = []
                upstreamRes.on('data', (chunk: Buffer) => chunks.push(chunk))
                upstreamRes.on('end', () => {
                  const html = Buffer.concat(chunks).toString('utf-8')
                  const downloadUrl = extractConfirmedDownloadUrl(html)
                  if (downloadUrl && remaining > 1) {
                    followRedirects(downloadUrl, remaining - 1)
                  } else {
                    if (!res.headersSent) {
                      res.writeHead(502, { 'Content-Type': 'text/plain' })
                    }
                    res.end('Google Drive requires confirmation; no download URL found in page')
                  }
                })
                return
              }

              // Google returns application/octet-stream for video files.
              // Derive the real MIME type from the content-disposition filename
              // so the browser knows how to handle the stream.
              const rawContentType = headers['content-type'] ?? ''
              const disposition = Array.isArray(headers['content-disposition'])
                ? headers['content-disposition'][0]
                : (headers['content-disposition'] ?? '')
              const resolvedContentType = rawContentType.startsWith('video/')
                ? rawContentType
                : (videoMimeFromDisposition(disposition) ?? 'video/mp4')

              const responseHeaders: Record<string, string> = {
                'content-type': resolvedContentType,
                'accept-ranges': headers['accept-ranges'] ?? 'bytes',
                // Required so COEP allows the response as a sub-resource
                'cross-origin-resource-policy': 'cross-origin',
              }
              if (headers['content-length'])
                responseHeaders['content-length'] = headers['content-length']
              if (headers['content-range'])
                responseHeaders['content-range'] = headers['content-range']

              res.writeHead(statusCode, responseHeaders)
              upstreamRes.pipe(res)
            },
          )

          upstreamReq.on('error', (err) => {
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'text/plain' })
            }
            res.end(`Proxy error: ${err.message}`)
          })

          upstreamReq.end()
        }

        followRedirects(targetUrl, 10)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    googleDriveProxyPlugin(),
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@ffmpeg/core'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})