import { JSONFilePreset } from 'lowdb/node'
import bcrypt from 'bcryptjs'
import type { ConversionJob, User } from '@veritext-convert/shared'

interface UserRecord extends User {
  passwordHash: string
}

interface DbSchema {
  users: UserRecord[]
  jobs: ConversionJob[]
}

const defaultData: DbSchema = { users: [], jobs: [] }

export const db = await JSONFilePreset<DbSchema>('./data/db.json', defaultData)

// Seed demo users on first run
await db.read()
if (db.data.users.length === 0) {
  const hash1 = await bcrypt.hash('demo1234', 10)
  const hash2 = await bcrypt.hash('demo1234', 10)
  db.data.users = [
    { id: 'user-1', name: 'Matt Coen', email: 'mcoen@veritext.com', passwordHash: hash1, createdAt: new Date().toISOString() },
    { id: 'user-2', name: 'Demo User', email: 'demo@veritext.com', passwordHash: hash2, createdAt: new Date().toISOString() },
  ]
  await db.write()
}

export type { UserRecord, DbSchema }
