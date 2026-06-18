'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { FileOutput, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql'

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      userId
      userName
      userEmail
      expiresAt
    }
  }
`

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e?: React.FormEvent, quickEmail?: string, quickPassword?: string) {
    e?.preventDefault()
    const loginEmail = quickEmail ?? email
    const loginPassword = quickPassword ?? password
    setError('')
    setLoading(true)
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: LOGIN_MUTATION, variables: { email: loginEmail, password: loginPassword } }),
      })
      const json = await res.json()
      if (json.errors) {
        setError(json.errors[0]?.message ?? 'Login failed')
      } else {
        const { token, userId, userName, userEmail } = json.data.login
        login(token, { id: userId, name: userName, email: userEmail })
        router.push('/dashboard')
      }
    } catch {
      setError('Network error. Is the API running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-veritext-ink via-veritext-navy to-veritext-blue">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-veritext-cyan/20 border border-veritext-cyan/40 mb-4">
            <FileOutput className="h-7 w-7 text-veritext-cyan" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Veritext Convert</h1>
          <p className="text-slate-400 mt-1 text-sm">Document conversion service</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input bg-white/10 border-white/30 text-white placeholder-slate-400 focus:border-veritext-cyan"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="label text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input bg-white/10 border-white/30 text-white placeholder-slate-400 focus:border-veritext-cyan"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full bg-veritext-cyan hover:bg-veritext-500 justify-center py-2.5"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </button>
          </form>

          {/* Quick login */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-slate-400 text-center mb-3">Quick login (demo accounts)</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleLogin(undefined, 'mcoen@veritext.com', 'demo1234')}
                disabled={loading}
                className="flex-1 btn-secondary bg-white/5 border-white/20 text-slate-200 hover:bg-white/10 text-xs py-2"
              >
                Matt Coen
              </button>
              <button
                onClick={() => handleLogin(undefined, 'demo@veritext.com', 'demo1234')}
                disabled={loading}
                className="flex-1 btn-secondary bg-white/5 border-white/20 text-slate-200 hover:bg-white/10 text-xs py-2"
              >
                Demo User
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
