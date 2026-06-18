'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { LockKeyhole, LogIn, ChevronDown, ChevronUp, FileOutput } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql'

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token userId userName userEmail expiresAt
    }
  }
`

const QUICK_LOGINS = [
  { email: 'mcoen@veritext.com', name: 'Matt Coen' },
  { email: 'demo@veritext.com', name: 'Demo User' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('mcoen@veritext.com')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showQuick, setShowQuick] = useState(true)

  async function runLogin(emailArg: string, passwordArg: string) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: LOGIN_MUTATION, variables: { email: emailArg, password: passwordArg } }),
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

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    runLogin(email, password)
  }

  function quick(quickEmail: string) {
    setEmail(quickEmail)
    setPassword('demo1234')
    runLogin(quickEmail, 'demo1234')
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Background gradient matching veritext-resolve's feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0d3f82_0%,_#082f61_40%,_#0a1424_100%)]" />

      <section className="relative mx-auto flex min-h-screen w-[94vw] max-w-6xl items-center justify-center py-8">
        <section className="w-full max-w-[560px] rounded-xl border border-slate-300/85 bg-white p-6 shadow-[0_16px_42px_-24px_rgba(0,30,90,0.5)]">

          {/* Logo circle */}
          <div className="flex justify-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-sky-400 bg-slate-100 shadow-[0_6px_24px_-14px_rgba(0,75,140,0.55)]">
              <FileOutput className="h-14 w-14 text-veritext-blue" />
            </div>
          </div>

          {/* Title */}
          <div className="mt-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-sky-500/75" />
            <h1 className="text-3xl font-medium tracking-tight text-slate-700">Veritext Convert</h1>
            <span className="h-px flex-1 bg-sky-500/75" />
          </div>

          <p className="mt-3 text-center text-xl font-medium text-slate-800">Sign In</p>
          <p className="mt-2 text-center text-sm text-slate-600">
            All seeded accounts use password{' '}
            <code className="rounded-sm bg-slate-100 px-1 py-0.5 font-mono text-xs">demo1234</code>.
          </p>

          {/* Form */}
          <form className="mt-6 space-y-3.5" onSubmit={submit}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="login-email">
              Email
              <input
                id="login-email"
                type="email"
                className="soft-input mt-1 w-full text-base"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="login-password">
              Password
              <input
                id="login-password"
                type="password"
                className="soft-input mt-1 w-full text-base"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
            )}

            <button
              type="submit"
              className="action-button w-full bg-veritext-blue! text-white! hover:bg-veritext-navy! shadow-[0_10px_28px_-18px_rgba(2,12,40,0.9)]"
              disabled={loading}
            >
              {loading
                ? <><LockKeyhole className="h-4 w-4 animate-pulse" /> Signing in…</>
                : <><LogIn className="h-4 w-4" /> Sign In</>
              }
            </button>
          </form>

          {/* Quick logins */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowQuick(v => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-veritext-cyan hover:text-veritext-blue transition"
            >
              <span>Demo accounts — one-click sign-in</span>
              {showQuick ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showQuick && (
              <div className="mt-2 grid gap-2">
                {QUICK_LOGINS.map(q => (
                  <button
                    key={q.email}
                    type="button"
                    onClick={() => quick(q.email)}
                    className="text-left rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-veritext-cyan hover:bg-blue-50/40 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-950 truncate">{q.name}</div>
                        <div className="text-xs text-slate-500 truncate">{q.email}</div>
                      </div>
                      <span className="status-pill shrink-0 border-blue-200 bg-blue-50 text-veritext-blue">User</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-[11px] uppercase tracking-[0.18em] text-slate-400">
            © Veritext Legal Solutions
          </div>
        </section>
      </section>
    </main>
  )
}
