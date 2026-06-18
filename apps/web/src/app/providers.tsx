'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'

// Auth Context
interface AuthUser {
  id: string
  name: string
  email: string
}

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem('vt-convert-token')
    const storedUser = localStorage.getItem('vt-convert-user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setMounted(true)
  }, [])

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('vt-convert-token', newToken)
    localStorage.setItem('vt-convert-user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('vt-convert-token')
    localStorage.removeItem('vt-convert-user')
    setToken(null)
    setUser(null)
  }

  if (!mounted) return null

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Apollo Client factory
function makeApolloClient(token: string | null) {
  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql',
  })

  const authLink = setContext((_, { headers }) => ({
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }))

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  })
}

function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [client] = useState(() => makeApolloClient(token))

  useEffect(() => {
    // Reset store on auth change
    client.resetStore().catch(() => {})
  }, [token, client])

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ApolloWrapper>{children}</ApolloWrapper>
    </AuthProvider>
  )
}
