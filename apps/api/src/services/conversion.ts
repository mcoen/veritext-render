const GOTENBERG_URL = process.env.GOTENBERG_URL ?? 'http://localhost:3000'

export const SUPPORTED_TYPES = [
  '.docx', '.xlsx', '.pptx',
  '.doc', '.xls', '.ppt',
  '.odt', '.ods', '.odp',
  '.rtf', '.csv', '.txt',
]

export async function convertToPdf(inputBuffer: Buffer, fileName: string): Promise<Buffer> {
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
