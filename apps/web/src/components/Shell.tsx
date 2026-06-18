'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, FileOutput, LogOut } from 'lucide-react'
import { useAuth } from '@/app/providers'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hoverClass: 'button-hover-blue' },
  { href: '/conversions', label: 'Conversions', icon: FileOutput, hoverClass: 'button-hover-cyan' },
]

function ProfileMenu({ user }: { user: { name: string; email: string } }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])

  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
  const active = pathname.startsWith('/profile')

  return (
    <div className="relative z-60" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={active || open ? 'icon-button-active overflow-hidden p-0' : 'icon-button overflow-hidden p-0'}
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-sm font-bold">{initials}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-100 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.5)]"
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-950 truncate">{user.name}</div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
            <div className="mt-1.5">
              <span className="status-pill border-blue-200 bg-blue-50 text-veritext-blue">User</span>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-rose-50 hover:text-rose-700"
            onClick={() => { setOpen(false); logout(); router.push('/login') }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto grid min-h-screen w-[96vw] max-w-[1800px] gap-4 py-4 lg:grid-cols-[280px_1fr]">

        {/* Sidebar */}
        <aside className="surface-panel hidden h-[calc(100dvh-2rem)] flex-col justify-between lg:flex min-h-0">
          <div className="flex flex-col space-y-2 min-h-0 flex-1">
            <div className="px-3 pt-2 pb-1 shrink-0">
              <img src="/Veritext_Logo_Color.png" alt="Veritext" className="mx-auto h-10 w-auto max-w-[180px]" />
            </div>
            <nav className="space-y-0.5 overflow-y-auto panel-scroll pr-1">
              <div className="px-3 pt-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-400 dark:text-slate-500">
                Navigation
              </div>
              {NAV.map(it => {
                const active = pathname.startsWith(it.href)
                const Icon = it.icon
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`module-nav-button-compact no-underline min-w-0 ${it.hoverClass} ${active ? 'active' : ''}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{it.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 text-center pt-3 border-t border-slate-200/70">
            © Veritext Legal Solutions
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 lg:h-[calc(100dvh-2rem)]">
          <div className="flex h-full min-w-0 flex-col gap-4 overflow-hidden">

            {/* Header */}
            <header className="surface-panel-strong relative z-50 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1
                    className="text-3xl font-bold tracking-tight text-veritext-blue truncate dark:text-blue-300"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    Veritext Render
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Convert Word, Excel, and PowerPoint documents to PDF.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {user && <ProfileMenu user={user} />}
                </div>
              </div>

              {/* Mobile nav */}
              <nav className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
                {NAV.map(it => {
                  const Icon = it.icon
                  const active = pathname.startsWith(it.href)
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                        active ? 'border-veritext-cyan bg-blue-50 text-veritext-blue' : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span>{it.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </header>

            {/* Content */}
            <div className="panel-scroll relative z-0 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              {children}
            </div>
          </div>
        </main>

      </div>
    </div>
  )
}
