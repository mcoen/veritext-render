import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import bcrypt from 'bcryptjs'
import type { ConversionJob, User } from '@veritext-render/shared'

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
export const ddb = DynamoDBDocumentClient.from(client)

export const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE ?? 'veritext-render-users'
export const JOBS_TABLE  = process.env.DYNAMODB_JOBS_TABLE  ?? 'veritext-render-jobs'

export interface UserRecord extends User {
  passwordHash: string
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<UserRecord | null> {
  const res = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { id } }))
  return (res.Item as UserRecord) ?? null
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const res = await ddb.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
    Limit: 1,
  }))
  return (res.Items?.[0] as UserRecord) ?? null
}

export async function putUser(user: UserRecord): Promise<void> {
  await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: user }))
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function getJobById(id: string): Promise<ConversionJob | null> {
  const res = await ddb.send(new GetCommand({ TableName: JOBS_TABLE, Key: { id } }))
  return (res.Item as ConversionJob) ?? null
}

export async function getJobsByUser(userId: string): Promise<ConversionJob[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: JOBS_TABLE,
    IndexName: 'userId-startedAt-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false,
  }))
  return (res.Items ?? []) as ConversionJob[]
}

export async function getAllJobs(): Promise<ConversionJob[]> {
  const items: ConversionJob[] = []
  let lastKey: Record<string, unknown> | undefined
  do {
    const res = await ddb.send(new ScanCommand({ TableName: JOBS_TABLE, ExclusiveStartKey: lastKey }))
    items.push(...((res.Items ?? []) as ConversionJob[]))
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)
  return items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

export async function putJob(job: ConversionJob): Promise<void> {
  await ddb.send(new PutCommand({ TableName: JOBS_TABLE, Item: job }))
}

export async function updateJob(id: string, fields: Partial<ConversionJob & { s3PdfKey?: string }>): Promise<void> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
  if (!entries.length) return
  const expr   = 'SET ' + entries.map(([k]) => `#${k} = :${k}`).join(', ')
  const names  = Object.fromEntries(entries.map(([k]) => [`#${k}`, k]))
  const values = Object.fromEntries(entries.map(([k, v]) => [`:${k}`, v]))
  await ddb.send(new UpdateCommand({
    TableName: JOBS_TABLE,
    Key: { id },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }))
}

export async function deleteJobRecord(id: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: JOBS_TABLE, Key: { id } }))
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seedIfEmpty() {
  const res = await ddb.send(new ScanCommand({ TableName: USERS_TABLE, Limit: 1 }))
  if ((res.Count ?? 0) > 0) return
  const [h1, h2] = await Promise.all([bcrypt.hash('demo1234', 10), bcrypt.hash('demo1234', 10)])
  await Promise.all([
    putUser({ id: 'user-1', name: 'Mike Coen', email: 'mcoen@veritext.com', passwordHash: h1, createdAt: new Date().toISOString() }),
    putUser({ id: 'user-2', name: 'Demo User', email: 'demo@veritext.com',  passwordHash: h2, createdAt: new Date().toISOString() }),
  ])
}

await seedIfEmpty()
