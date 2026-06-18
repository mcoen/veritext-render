'use client'

import { useCallback, useRef, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { MY_CONVERSION_JOBS, DELETE_JOB } from '@/lib/graphql/queries'
import { formatDistanceToNow, differenceInSeconds } from 'date-fns'
import { Upload, Trash2, Download, FileOutput, Loader2 } from 'lucide-react'
import { getToken } from '@/lib/auth'
import type { ConversionJob } from '@veritext-convert/shared'

const SUPPORTED = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.odt', '.ods', '.odp', '.rtf', '.csv', '.txt']

const CONVERT_MUTATION = `
  mutation ConvertDocument($file: Upload!, $fileName: String!) {
    convertDocument(file: $file, fileName: $fileName) {
      id status fileName startedAt
    }
  }
`

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'border-yellow-300 bg-yellow-50 text-yellow-700',
    PROCESSING: 'border-blue-300 bg-blue-50 text-blue-700',
    COMPLETED: 'border-green-300 bg-green-50 text-green-700',
    FAILED: 'border-red-300 bg-red-50 text-red-700',
  }
  return <span className={`status-pill ${styles[status] ?? ''}`}>{status}</span>
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ConversionsPage() {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, loading, refetch } = useQuery<{ myConversionJobs: ConversionJob[] }>(MY_CONVERSION_JOBS, {
    pollInterval: 3000,
  })

  const [deleteJob] = useMutation(DELETE_JOB, {
    onCompleted: () => refetch(),
  })

  const jobs = data?.myConversionJobs ?? []

  async function uploadFile(file: File) {
    setUploading(true)
    setUploadError('')
    const token = getToken()
    const body = new FormData()
    const map = JSON.stringify({ '0': ['variables.file'] })
    const operations = JSON.stringify({
      query: CONVERT_MUTATION,
      variables: { file: null, fileName: file.name },
    })
    body.append('operations', operations)
    body.append('map', map)
    body.append('0', file, file.name)

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql', {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body,
      })
      const json = await res.json()
      if (json.errors) {
        setUploadError(json.errors[0]?.message ?? 'Upload failed')
      } else {
        await refetch()
      }
    } catch {
      setUploadError('Network error. Is the API running?')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await uploadFile(file)
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await uploadFile(file)
    e.target.value = ''
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="h1">Conversions</h1>
        <p className="muted mt-0.5">Upload documents to convert to PDF</p>
      </div>

      {/* Upload */}
      <div className="surface-panel">
        <h2 className="h2 mb-4">Upload Document</h2>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragging ? 'border-veritext-cyan bg-veritext-cyan/5' : 'border-slate-300 hover:border-veritext-cyan hover:bg-slate-50'
          }`}
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept={SUPPORTED.join(',')} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-veritext-cyan animate-spin" />
              <p className="text-sm text-slate-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Drop a file here, or click to browse</p>
              <p className="text-xs text-slate-500">{SUPPORTED.join(', ')}</p>
            </div>
          )}
        </div>
        {uploadError && (
          <p className="mt-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</p>
        )}
      </div>

      {/* Jobs Table */}
      <div className="surface-panel p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="h2">All Conversions</h2>
        </div>
        {loading && jobs.length === 0 ? (
          <div className="p-8 text-center muted">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center muted">
            <FileOutput className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            No conversions yet. Upload a file above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">File Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Type</th>
                  <th className="px-4 py-2 text-left font-semibold">Size</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-left font-semibold">Started</th>
                  <th className="px-4 py-2 text-left font-semibold">Duration</th>
                  <th className="px-4 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map(job => {
                  const duration = job.completedAt
                    ? `${differenceInSeconds(new Date(job.completedAt), new Date(job.startedAt))}s`
                    : job.status === 'PROCESSING' || job.status === 'PENDING' ? 'In progress' : '—'
                  return (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 max-w-xs truncate">{job.fileName}</p>
                        {job.error && <p className="text-xs text-red-500 truncate max-w-xs">{job.error}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{job.fileType}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatBytes(job.fileSizeBytes)}</td>
                      <td className="px-4 py-3"><StatusPill status={job.status} /></td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{duration}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {job.downloadUrl && job.status === 'COMPLETED' && (
                            <a href={job.downloadUrl} target="_blank" rel="noopener noreferrer" className="icon-button text-veritext-blue" title="Download PDF">
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => deleteJob({ variables: { id: job.id } })}
                            className="icon-button text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
