import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)
  const { user: currentUser } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const res = await api.instance.get('/admin/users')
      setUsers(res.data.users || [])
    } catch (e) {
      setError('Unauthorized access')
    }
  }

  async function toggleApproval(userId, currentStatus) {
    try {
      const endpoint = currentStatus ? 'reject' : 'approve'
      await api.instance.patch(`/admin/users/${userId}/${endpoint}`)
      setUsers(users.map(u => u._id === userId ? { ...u, isApproved: !currentStatus } : u))
    } catch (e) {
      setError('Failed to update status')
    }
  }

  async function removeUser(userId) {
    if (!window.confirm('Remove this user from the system?')) return
    try {
      await api.instance.delete(`/admin/users/${userId}`)
      setUsers(users.filter(u => u._id !== userId))
    } catch (e) {
      setError('Failed to remove user')
    }
  }

  return (
    <div className="flex min-h-screen bg-[#060612]">
      <div className="grid-overlay"></div>
      
      {/* Sidebar (Shared) */}
      <aside className="w-64 glass-card rounded-none border-y-0 border-l-0 border-r flex flex-col z-10 sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] rounded-xl flex items-center justify-center shadow-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">TaskFlow</span>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-2)] hover:bg-white/5 hover:text-white transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </Link>
          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] font-medium transition-all border border-[var(--accent)]/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Team
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-12 relative z-10">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-extrabold text-white mb-2">Team Management</h1>
            <p className="text-[var(--text-2)]">Review access requests and manage user roles.</p>
          </header>

          {error && <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">{error}</div>}

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[var(--text-3)] text-[10px] uppercase tracking-widest font-bold">
                    <th className="px-8 py-4">User Info</th>
                    <th className="px-8 py-4">Role</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-sm text-white shadow-lg">
                            {u.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-xs text-[var(--text-3)]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`badge ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white/5 text-[var(--text-3)]'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`badge ${u.isApproved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {u.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right space-x-2">
                        {u._id !== currentUser.id && (
                          <>
                            <button 
                              onClick={() => toggleApproval(u._id, u.isApproved)}
                              className={`btn px-3 py-1.5 text-xs ${u.isApproved ? 'btn-secondary' : 'btn-primary'}`}
                            >
                              {u.isApproved ? 'Revoke' : 'Approve'}
                            </button>
                            <button 
                              onClick={() => removeUser(u._id)}
                              className="btn btn-danger px-3 py-1.5 text-xs"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && <div className="text-center py-20 opacity-50">No users found.</div>}
          </div>
        </div>
      </main>
    </div>
  )
}
