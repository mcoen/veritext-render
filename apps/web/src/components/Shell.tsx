'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { FileOutput, LayoutDashboard, LogOut } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/conversions', label: 'Conversions', icon: FileOutput },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-200 dark:border-slate-700">
          <div className="h-7 w-7 rounded-lg bg-veritext-blue flex items-center justify-center">
            <FileOutput className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">Veritext Convert</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`module-nav-button ${active ? 'bg-veritext-blue/10 text-veritext-blue font-semibold dark:bg-veritext-blue/20 dark:text-veritext-400' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="h-7 w-7 rounded-full bg-veritext-blue flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="module-nav-button text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto panel-scroll">
        {children}
      </main>
    </div>
  )
}
