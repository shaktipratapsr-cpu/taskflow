import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Project() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskData, setTaskData] = useState({ title: '', description: '', priority: 'medium', status: 'assigned' })
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      try {
        const res = await api.instance.get(`/projects/${id}`)
        setProject(res.data.project)
        const tRes = await api.instance.get(`/projects/${id}/tasks`)
        setTasks(tRes.data.tasks || [])
      } catch (e) {
        setError('Failed to load project details')
      }
    })()
  }, [id])

  async function createTask(e) {
    e.preventDefault()
    try {
      const res = await api.instance.post('/tasks', { ...taskData, project_id: id })
      setTasks([res.data.task, ...tasks])
      setTaskData({ title: '', description: '', priority: 'medium', status: 'assigned' })
      setShowTaskForm(false)
    } catch (e) {
      setError('Failed to create task')
    }
  }

  async function updateStatus(taskId, newStatus) {
    try {
      await api.instance.put(`/tasks/${taskId}`, { status: newStatus })
      setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t))
    } catch (e) {
      setError('Update failed')
    }
  }

  if (!project) return <div className="p-12 text-center text-[var(--text-3)]">Loading workspace...</div>

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
          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-2)] hover:bg-white/5 hover:text-white transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Team
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-12 relative z-10">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline mb-6">← Back to Dashboard</Link>
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-2">{project.name}</h1>
                <p className="text-[var(--text-2)]">{project.description || 'Collaborate and track progress for this project.'}</p>
              </div>
              <button onClick={() => setShowTaskForm(!showTaskForm)} className="btn btn-primary">Add Task</button>
            </div>
          </header>

          {showTaskForm && (
            <div className="mb-12 glass-card p-8 border-[var(--accent)]/30 bg-[var(--accent)]/5">
              <h3 className="text-xl font-bold mb-6">New Task</h3>
              <form onSubmit={createTask} className="space-y-6">
                <input className="input" placeholder="Task title" value={taskData.title} onChange={e => setTaskData({...taskData, title: e.target.value})} required />
                <textarea className="input" placeholder="Description" value={taskData.description} onChange={e => setTaskData({...taskData, description: e.target.value})} rows="2"></textarea>
                <div className="grid grid-cols-2 gap-4">
                  <select className="input" value={taskData.priority} onChange={e => setTaskData({...taskData, priority: e.target.value})}>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select className="input" value={taskData.status} onChange={e => setTaskData({...taskData, status: e.target.value})}>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="btn btn-primary">Create Task</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowTaskForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white px-2">Project Tasks</h3>
            {tasks.map(t => {
              const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
              return (
                <div key={t._id} className={`glass-card p-6 flex items-center justify-between group ${overdue ? 'border-red-500/50' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className={`font-semibold text-white ${t.status === 'completed' ? 'line-through opacity-50' : ''}`}>{t.title}</h4>
                      <span className={`badge ${
                        t.priority === 'critical' ? 'bg-red-500/10 text-red-400' : 
                        t.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>{t.priority}</span>
                      <span className={`badge ${
                        t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                        t.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-white/5 text-[var(--text-3)]'
                      }`}>{t.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-[var(--text-2)]">{t.description || 'No description provided.'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {t.status !== 'completed' && (
                      <button 
                        onClick={() => updateStatus(t._id, t.status === 'assigned' ? 'in_progress' : 'completed')}
                        className="btn btn-secondary text-xs opacity-0 group-hover:opacity-100"
                      >
                        {t.status === 'assigned' ? 'Start Task' : 'Complete'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {tasks.length === 0 && <div className="text-center py-20 glass-card opacity-50">No tasks created yet.</div>}
          </div>
        </div>
      </main>
    </div>
  )
}
