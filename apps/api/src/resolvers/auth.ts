import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { getUserByEmail, putUser } from '../db/index.js'
import { GraphQLError } from 'graphql'
import type { Context } from '../context.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'veritext-render-secret'

function makeToken(user: { id: string; name: string; email: string }) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' })
  return { token, userId: user.id, userName: user.name, userEmail: user.email, expiresAt }
}

export const authResolvers = {
  Mutation: {
    register: async (_: unknown, { name, email, password }: { name: string; email: string; password: string }, _ctx: Context) => {
      const existing = await getUserByEmail(email)
      if (existing) throw new GraphQLError('Email already registered', { extensions: { code: 'BAD_USER_INPUT' } })
      const passwordHash = await bcrypt.hash(password, 10)
      const user = { id: uuidv4(), name, email, passwordHash, createdAt: new Date().toISOString() }
      await putUser(user)
      return makeToken(user)
    },
    login: async (_: unknown, { email, password }: { email: string; password: string }, _ctx: Context) => {
      const user = await getUserByEmail(email)
      if (!user) throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } })
      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } })
      return makeToken(user)
    },
  },
}
