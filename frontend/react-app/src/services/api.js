import axios from 'axios'

const STORAGE_KEY = 'taskflow_token'
const API_BASE = '/api'

const instance = axios.create({
  baseURL: API_BASE,
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
})

function setAuthToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token)
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    localStorage.removeItem(STORAGE_KEY)
    delete instance.defaults.headers.common['Authorization']
  }
}

// Initialize from storage
const existing = localStorage.getItem(STORAGE_KEY)
if (existing) instance.defaults.headers.common['Authorization'] = `Bearer ${existing}`

async function signupUser(name, email, password) {
  const res = await instance.post('/auth/signup', { name, email, password })
  if (res.data?.token) setAuthToken(res.data.token)
  return res.data
}

async function loginUser(email, password) {
  const res = await instance.post('/auth/login', { email, password })
  if (res.data?.token) setAuthToken(res.data.token)
  return res.data
}

async function logout() {
  try { await instance.post('/auth/logout') } catch (e) { /* ignore */ }
  setAuthToken(null)
}

async function getMe() {
  return instance.get('/auth/me')
}

async function getProjects() {
  return instance.get('/projects')
}

async function getProject(projectId) {
  return instance.get(`/projects/${projectId}`)
}

async function getTasks(projectId) {
  return instance.get(`/tasks/project/${projectId}`)
}

async function createTask(payload) {
  return instance.post('/tasks', payload)
}

async function updateTask(taskId, payload) {
  return instance.put(`/tasks/${taskId}`, payload)
}

// Admin functions
async function getUsers() {
  return instance.get('/admin/users')
}

async function approveUser(userId) {
  return instance.patch(`/admin/users/${userId}/approve`)
}

async function removeUser(userId) {
  return instance.patch(`/admin/users/${userId}/reject`)
}

async function deleteUser(userId) {
  return instance.delete(`/admin/users/${userId}`)
}

export default {
  instance,
  setAuthToken,
  signupUser,
  loginUser,
  logout,
  getMe,
  getProjects,
  getProject,
  getTasks,
  createTask,
  updateTask,
  getUsers,
  approveUser,
  removeUser,
  deleteUser
}
