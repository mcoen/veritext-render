const GOTENBERG_URL = process.env.GOTENBERG_URL ?? 'http://localhost:3000'

export const SUPPORTED_TYPES = [
  // Documents
  '.docx', '.xlsx', '.pptx',
  '.doc', '.xls', '.ppt',
  '.odt', '.ods', '.odp',
  '.rtf', '.csv', '.txt',
  // Images (LibreOffice route)
  '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.gif',
  // Images (Chromium route)
  '.svg', '.webp',
]

const CHROMIUM_IMAGE_TYPES = new Set(['.svg', '.webp'])

export async function convertToPdf(inputBuffer: Buffer, fileName: string): Promise<Buffer> {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()

  if (CHROMIUM_IMAGE_TYPES.has(ext)) {
    return convertImageViaChromium(inputBuffer, fileName, ext)
  }

  const form = new FormData()
  form.append('files', new Blob([new Uint8Array(inputBuffer)]), fileName)

  const response = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gotenberg conversion failed (${response.status}): ${text}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function convertImageViaChromium(inputBuffer: Buffer, fileName: string, ext: string): Promise<Buffer> {
  const mimeTypes: Record<string, string> = {
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  }
  const mime = mimeTypes[ext] ?? 'application/octet-stream'
  const b64 = inputBuffer.toString('base64')

  // Wrap in a minimal HTML page that renders the image full-page
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
  img { display: block; max-width: 100%; height: auto; }
</style>
</head>
<body>
<img src="data:${mime};base64,${b64}" />
</body>
</html>`

  const form = new FormData()
  form.append('files', new Blob([html], { type: 'text/html' }), 'index.html')
  form.append('marginTop', '0')
  form.append('marginBottom', '0')
  form.append('marginLeft', '0')
  form.append('marginRight', '0')
  form.append('preferCssPageSize', 'true')

  const response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gotenberg conversion failed (${response.status}): ${text}`)
  }

  return Buffer.from(await response.arrayBuffer())
}
