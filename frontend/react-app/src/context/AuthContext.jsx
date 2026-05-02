import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = not-authenticated

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getMe()
        if (mounted) setUser(res.data.user)
      } catch (e) {
        if (mounted) setUser(null)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
