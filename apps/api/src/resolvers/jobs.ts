import { GraphQLError } from 'graphql'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { db } from '../db/index.js'
import { convertToPdf, SUPPORTED_TYPES } from '../services/conversion.js'
import type { Context } from '../context.js'
import type { FileUpload } from 'graphql-upload-ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsBase = path.join(__dirname, '../../uploads')

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

export const jobResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      await db.read()
      const user = db.data.users.find(u => u.id === ctx.user!.id)
      if (!user) throw new GraphQLError('User not found')
      return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
    },
    conversionJob: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      await db.read()
      const job = db.data.jobs.find(j => j.id === id)
      if (!job) return null
      if (job.userId !== ctx.user.id) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
      return job
    },
    myConversionJobs: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      await db.read()
      return db.data.jobs
        .filter(j => j.userId === ctx.user!.id)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    },
    allConversionJobs: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      await db.read()
      return db.data.jobs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    },
  },
  Mutation: {
    convertDocument: async (_: unknown, { file, fileName }: { file: Promise<FileUpload>; fileName: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })

      const { createReadStream, mimetype, filename } = await file
      const ext = path.extname(fileName || filename).toLowerCase()

      if (!SUPPORTED_TYPES.includes(ext)) {
        throw new GraphQLError(`Unsupported file type: ${ext}`, { extensions: { code: 'BAD_USER_INPUT' } })
      }

      // Read stream to buffer
      const stream = createReadStream()
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer))
      }
      const inputBuffer = Buffer.concat(chunks)

      const jobId = uuidv4()
      const originalFileName = fileName || filename
      const fileSizeBytes = inputBuffer.length

      // Save original
      await ensureDir(path.join(uploadsBase, 'originals'))
      await fs.writeFile(path.join(uploadsBase, 'originals', `${jobId}${ext}`), inputBuffer)

      // Create job record
      const job = {
        id: jobId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        userEmail: ctx.user.email,
        fileName: originalFileName,
        fileType: ext,
        fileSizeBytes,
        status: 'PENDING' as const,
        startedAt: new Date().toISOString(),
      }

      await db.read()
      db.data.jobs.push(job)
      await db.write()

      // Async conversion (do not await)
      ;(async () => {
        try {
          await db.read()
          const idx = db.data.jobs.findIndex(j => j.id === jobId)
          if (idx === -1) return
          db.data.jobs[idx] = { ...db.data.jobs[idx], status: 'PROCESSING' }
          await db.write()

          const pdfBuffer = await convertToPdf(inputBuffer, originalFileName)

          await ensureDir(path.join(uploadsBase, 'pdfs'))
          await fs.writeFile(path.join(uploadsBase, 'pdfs', `${jobId}.pdf`), pdfBuffer)

          const downloadUrl = `http://localhost:4000/files/pdfs/${jobId}.pdf`
          await db.read()
          const idx2 = db.data.jobs.findIndex(j => j.id === jobId)
          if (idx2 === -1) return
          db.data.jobs[idx2] = {
            ...db.data.jobs[idx2],
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
            downloadUrl,
          }
          await db.write()
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await db.read()
          const idx = db.data.jobs.findIndex(j => j.id === jobId)
          if (idx !== -1) {
            db.data.jobs[idx] = {
              ...db.data.jobs[idx],
              status: 'FAILED',
              completedAt: new Date().toISOString(),
              error: msg,
            }
            await db.write()
          }
        }
      })()

      return job
    },
    deleteConversionJob: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
      await db.read()
      const idx = db.data.jobs.findIndex(j => j.id === id)
      if (idx === -1) throw new GraphQLError('Job not found')
      if (db.data.jobs[idx].userId !== ctx.user.id) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
      db.data.jobs.splice(idx, 1)
      await db.write()
      return true
    },
  },
}
