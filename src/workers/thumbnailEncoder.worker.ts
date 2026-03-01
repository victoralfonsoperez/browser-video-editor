declare function postMessage(message: unknown, transfer?: Transferable[]): void

interface WorkerRequest {
  id: number
  buffer: ArrayBuffer
  width: number
  height: number
}

const CHUNK_SIZE = 8192

async function encodeToDataUrl(
  buffer: ArrayBuffer,
  width: number,
  height: number,
): Promise<string | null> {
  try {
    const data = new Uint8ClampedArray(buffer)
    const imageData = new ImageData(data, width, height)
    const offscreen = new OffscreenCanvas(width, height)
    const ctx = offscreen.getContext('2d')
    if (!ctx) return null
    ctx.putImageData(imageData, 0, 0)
    const blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: 0.6 })
    const arrayBuffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i += CHUNK_SIZE) {
      binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK_SIZE)))
    }
    return `data:image/jpeg;base64,${btoa(binary)}`
  } catch {
    return null
  }
}

self.onmessage = async (ev: MessageEvent) => {
  const { id, buffer, width, height } = ev.data as WorkerRequest
  const dataUrl = await encodeToDataUrl(buffer, width, height)
  postMessage({ id, dataUrl })
}
