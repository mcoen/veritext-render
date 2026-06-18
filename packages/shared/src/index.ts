export type ConversionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface ConversionJob {
  id: string
  userId: string
  userName: string
  userEmail: string
  fileName: string
  fileType: string
  fileSizeBytes: number
  status: ConversionStatus
  startedAt: string
  completedAt?: string
  downloadUrl?: string
  error?: string
}

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export const SUPPORTED_EXTENSIONS = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.odt', '.ods', '.odp', '.rtf', '.csv', '.txt']
