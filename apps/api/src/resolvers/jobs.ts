import { GraphQLError } from 'graphql'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { getUserById, getJobById, getJobsByUser, getAllJobs, putJob, updateJob, deleteJobRecord } from '../db/index.js'
import { uploadToS3, downloadFromS3, deleteFromS3, getPresignedUrl, originalKey, pdfKey } from '../services/storage.js'
import { convertToPdf, SUPPORTED_TYPES } from '../services/conversion.js'
import type { Context } from '../context.js'
import type { FileUpload } from 'graphql-upload-ts'
import type { ConversionJob } from '@veritext-render/shared'

async function withDownloadUrl(job: ConversionJob & { s3PdfKey?: string }): Promise<ConversionJob> {
  if (job.status === 'COMPLETED' && job.s3PdfKey) {
    const downloadUrl = await getPresignedUrl(job.s3PdfKey)
    return { ...job, downloadUrl }
  }
  return job
}

async function withDownloadUrls(jobs: (ConversionJob & { s3PdfKey?: string })[]): Promise<ConversionJob[]> {
  return Promise.all(jobs.map(withDownloadUrl))
}

export const jobResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const user = await getUserById(ctx.user.id)
      if (!user) throw new GraphQLError('User not found')
      return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
    },
    conversionJob: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const job = await getJobById(id)
      if (!job) return null
      if (job.userId !== ctx.user.id) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
      return withDownloadUrl(job as ConversionJob & { s3PdfKey?: string })
    },
    myConversionJobs: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const jobs = await getJobsByUser(ctx.user.id)
      return withDownloadUrls(jobs as (ConversionJob & { s3PdfKey?: string })[])
    },
    allConversionJobs: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const jobs = await getAllJobs()
      return withDownloadUrls(jobs as (ConversionJob & { s3PdfKey?: string })[])
    },
  },

  Mutation: {
    convertDocument: async (_: unknown, { file, fileName }: { file: Promise<FileUpload>; fileName: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })

      const { createReadStream, filename } = await file
      const ext = path.extname(fileName || filename).toLowerCase()

      if (!SUPPORTED_TYPES.includes(ext)) {
        throw new GraphQLError(`Unsupported file type: ${ext}`, { extensions: { code: 'BAD_USER_INPUT' } })
      }

      const stream = createReadStream()
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer))
      }
      const inputBuffer = Buffer.concat(chunks)

      const jobId = uuidv4()
      const originalFileName = fileName || filename

      await uploadToS3(inputBuffer, originalKey(jobId, ext), 'application/octet-stream')

      const job: ConversionJob = {
        id: jobId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        userEmail: ctx.user.email,
        fileName: originalFileName,
        fileType: ext,
        fileSizeBytes: inputBuffer.length,
        status: 'PENDING',
        startedAt: new Date().toISOString(),
      }
      await putJob(job)

      // Async conversion
      ;(async () => {
        try {
          await updateJob(jobId, { status: 'PROCESSING' })
          const pdfBuffer = await convertToPdf(inputBuffer, originalFileName)
          const key = pdfKey(jobId)
          await uploadToS3(pdfBuffer, key, 'application/pdf')
          await updateJob(jobId, { status: 'COMPLETED', completedAt: new Date().toISOString(), s3PdfKey: key } as Partial<ConversionJob & { s3PdfKey: string }>)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await updateJob(jobId, { status: 'FAILED', completedAt: new Date().toISOString(), error: msg })
        }
      })()

      return job
    },

    deleteConversionJob: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const job = await getJobById(id)
      if (!job) throw new GraphQLError('Job not found')
      if (job.userId !== ctx.user.id) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
      const j = job as ConversionJob & { s3PdfKey?: string }
      await Promise.allSettled([
        deleteFromS3(originalKey(job.id, job.fileType)),
        j.s3PdfKey ? deleteFromS3(j.s3PdfKey) : Promise.resolve(),
      ])
      await deleteJobRecord(id)
      return true
    },

    cancelConversionJob: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const job = await getJobById(id)
      if (!job) throw new GraphQLError('Job not found')
      if (job.userId !== ctx.user.id) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
      if (job.status !== 'PENDING' && job.status !== 'PROCESSING') {
        throw new GraphQLError('Only PENDING or PROCESSING jobs can be cancelled')
      }
      await updateJob(id, { status: 'FAILED', completedAt: new Date().toISOString(), error: 'Cancelled by user' })
      return { ...job, status: 'FAILED', completedAt: new Date().toISOString(), error: 'Cancelled by user' }
    },

    reprocessConversionJob: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      const job = await getJobById(id)
      if (!job) throw new GraphQLError('Job not found')
      if (job.userId !== ctx.user.id) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
      if (job.status !== 'FAILED') throw new GraphQLError('Only FAILED jobs can be reprocessed')

      const inputBuffer = await downloadFromS3(originalKey(job.id, job.fileType)).catch(() => {
        throw new GraphQLError('Original file not found in storage — please upload again')
      })

      const resetFields = { status: 'PENDING' as const, startedAt: new Date().toISOString(), completedAt: undefined, downloadUrl: undefined, error: undefined }
      await updateJob(id, resetFields)
      const updatedJob = { ...job, ...resetFields }

      ;(async () => {
        try {
          await updateJob(id, { status: 'PROCESSING' })
          const pdfBuffer = await convertToPdf(inputBuffer, job.fileName)
          const key = pdfKey(job.id)
          await uploadToS3(pdfBuffer, key, 'application/pdf')
          await updateJob(id, { status: 'COMPLETED', completedAt: new Date().toISOString(), s3PdfKey: key } as Partial<ConversionJob & { s3PdfKey: string }>)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await updateJob(id, { status: 'FAILED', completedAt: new Date().toISOString(), error: msg })
        }
      })()

      return updatedJob
    },
  },
}
