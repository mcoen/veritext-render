import jwt from 'jsonwebtoken'
import type { Request, Response } from 'express'

export interface Context {
  user: { id: string; name: string; email: string } | null
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'veritext-render-secret'

export async function createContext({ req }: { req: Request; res: Response }): Promise<Context> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return { user: null }
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; name: string; email: string }
    return { user: { id: payload.id, name: payload.name, email: payload.email } }
  } catch {
    return { user: null }
  }
}
