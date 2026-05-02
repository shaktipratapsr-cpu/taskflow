import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0 })
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', color: '#6366f1' })
  const navigate = useNavigate()
  const { user, setUser } = useAuth()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [projRes, statsRes] = await Promise.all([
        api.instance.get('/projects'),
        api.instance.get('/dashboard/stats')
      ])
      setProjects(projRes.data.projects || [])
      setStats({
        total: statsRes.data.taskStats?.total || 0,
        completed: statsRes.data.taskStats?.completed || 0,
        overdue: statsRes.data.taskStats?.overdue || 0
      })
    } catch (e) {
      setError('Failed to load dashboard data')
    }
  }

  async function logout() {
    await api.logout()
    setUser(null)
    navigate('/login')
  }

  async function createProject(e) {
    e.preventDefault()
    if (!formData.name.trim()) return
    try {
      const res = await api.instance.post('/projects', formData)
      setProjects(p => [res.data.project, ...p])
      setFormData({ name: '', description: '', color: '#6366f1' })
      setShowForm(false)
    } catch (e) {
      setError('Failed to create project')
    }
  }

  return (
    <div className="flex min-h-screen bg-[#060612]">
      <div className="grid-overlay"></div>
      
      {/* Sidebar */}
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
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] font-medium transition-all border border-[var(--accent)]/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </Link>
          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-2)] hover:bg-white/5 hover:text-white transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Team
          </Link>
        </nav>

        <div className="p-4 mt-auto border-t border-[var(--border)]">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-[var(--border)] mb-4">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center font-bold text-xs">
              {user?.name?.[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-semibold truncate text-white">{user?.name}</div>
              <div className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">{user?.role}</div>
            </div>
          </div>
          <button onClick={logout} className="w-full btn btn-secondary justify-center text-xs">Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 relative z-10">
        <div className="max-w-5xl mx-auto">
          <header className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-extrabold text-white mb-2">Workspace</h1>
              <p className="text-[var(--text-2)]">Welcome back, {user?.name.split(' ')[0]}. Here's what's happening.</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Project
            </button>
          </header>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="glass-card p-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-2xl">📂</div>
              <div>
                <div className="text-3xl font-bold text-white">{projects.length}</div>
                <div className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Projects</div>
              </div>
            </div>
            <div className="glass-card p-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl">✅</div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.completed}</div>
                <div className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Completed</div>
              </div>
            </div>
            <div className="glass-card p-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-2xl">🔥</div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.overdue}</div>
                <div className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Overdue</div>
              </div>
            </div>
          </div>

          <section>
            {showForm && (
              <div className="mb-12 glass-card p-8 border-[var(--accent)]/30 bg-[var(--accent)]/5">
                <h3 className="text-xl font-bold mb-6">Create New Project</h3>
                <form onSubmit={createProject} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Project Name</label>
                      <input className="input" placeholder="e.g. Website Redesign" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Theme Color</label>
                      <input type="color" className="w-full h-12 rounded-lg cursor-pointer bg-black/30 border border-[var(--border)]" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Description</label>
                    <textarea className="input" placeholder="Project goals and context..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3"></textarea>
                  </div>
                  <div className="flex gap-4">
                    <button type="submit" className="btn btn-primary">Create Project</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {error && <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {projects.map(p => (
                <Link to={`/project/${p._id}`} key={p._id} className="glass-card p-8 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{background: `${p.color}20`, color: p.color}}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[var(--accent)] transition-colors">{p.name}</h3>
                  <p className="text-[var(--text-2)] text-sm mb-8 line-clamp-2 h-10">{p.description || 'No description provided for this project.'}</p>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></div>
                      <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Active</span>
                    </div>
                    <svg className="w-5 h-5 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-all group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </div>
                </Link>
              ))}
            </div>
            
            {projects.length === 0 && (
              <div className="text-center py-20 glass-card">
                <div className="text-4xl mb-4 opacity-30">📁</div>
                <h3 className="text-lg font-bold">No projects yet</h3>
                <p className="text-[var(--text-muted)]">Get started by creating your first workspace.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
