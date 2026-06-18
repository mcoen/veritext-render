import libre from 'libreoffice-convert'
import { promisify } from 'util'

const convertAsync = promisify(libre.convert)

export async function convertToPdf(inputBuffer: Buffer): Promise<Buffer> {
  return convertAsync(inputBuffer, '.pdf', undefined) as Promise<Buffer>
}

export const SUPPORTED_TYPES = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.odt', '.ods', '.odp', '.rtf', '.csv', '.txt']
