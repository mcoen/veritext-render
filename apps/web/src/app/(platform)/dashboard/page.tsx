'use client'

import Link from 'next/link'
import { useQuery } from '@apollo/client'
import { MY_CONVERSION_JOBS } from '@/lib/graphql/queries'
import { formatDistanceToNow } from 'date-fns'
import { FileOutput, CheckCircle2, Clock, XCircle, Plus } from 'lucide-react'
import type { ConversionJob } from '@veritext-convert/shared'

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'border-yellow-300 bg-yellow-50 text-yellow-700',
    PROCESSING: 'border-blue-300 bg-blue-50 text-blue-700',
    COMPLETED: 'border-green-300 bg-green-50 text-green-700',
    FAILED: 'border-red-300 bg-red-50 text-red-700',
  }
  return (
    <span className={`status-pill ${styles[status] ?? ''}`}>{status}</span>
  )
}

export default function DashboardPage() {
  const { data, loading } = useQuery<{ myConversionJobs: ConversionJob[] }>(MY_CONVERSION_JOBS, {
    pollInterval: 5000,
  })

  const jobs = data?.myConversionJobs ?? []
  const total = jobs.length
  const completed = jobs.filter(j => j.status === 'COMPLETED').length
  const processing = jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length
  const failed = jobs.filter(j => j.status === 'FAILED').length
  const recent = jobs.slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1">Dashboard</h1>
          <p className="muted mt-0.5">Overview of your document conversions</p>
        </div>
        <Link href="/conversions" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Conversion
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-panel">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileOutput className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>
        <div className="surface-panel">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{loading ? '—' : completed}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="surface-panel">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{loading ? '—' : processing}</p>
              <p className="text-xs text-slate-500">Processing</p>
            </div>
          </div>
        </div>
        <div className="surface-panel">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{loading ? '—' : failed}</p>
              <p className="text-xs text-slate-500">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="surface-panel p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="h2">Recent Conversions</h2>
          <Link href="/conversions" className="action-button text-xs">View all</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center muted">Loading...</div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center muted">No conversions yet. <Link href="/conversions" className="text-veritext-blue hover:underline">Upload a file</Link></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">File</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
                <th className="px-4 py-2 text-left font-semibold">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map(job => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 truncate max-w-xs">{job.fileName}</p>
                    <p className="text-xs text-slate-500">{job.fileType} · {(job.fileSizeBytes / 1024).toFixed(1)} KB</p>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={job.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
