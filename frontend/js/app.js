/* ═══════════════════════════════════════════════════
   TASKFLOW - Main Application
═══════════════════════════════════════════════════ */

let currentUser = null;
let currentProject = null;
let allUsers = [];

/* ── Init ── */
async function init() {
  const token = API.getToken();
  if (token) {
    try {
      const data = await API.get('/auth/me');
      currentUser = data.user;
      if (currentUser.isApproved === false) showPending();
      else showApp();
    } catch { showAuth(); }
  } else { showAuth(); }
}

/* ── Auth ── */
function showAuth() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('pending-screen').classList.remove('active');
}

function showPending() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('pending-screen').classList.add('active');
}

function showApp() {
  if (currentUser.isApproved === false) return showPending();
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('pending-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  updateSidebarUser();
  if (currentUser.role === 'admin') document.getElementById('admin-nav').classList.remove('hidden');
  loadDashboard();
  loadAllUsers();
}

function updateSidebarUser() {
  const a = document.getElementById('sidebar-avatar');
  a.style.background = currentUser.avatar_color || '#6366f1';
  a.textContent = initials(currentUser.name);
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-role').textContent = currentUser.role;
  document.getElementById('dash-name').textContent = currentUser.name.split(' ')[0];
}

// Auth Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
  };
});

document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  try {
    const data = await API.post('/auth/login', { email, password });
    API.setToken(data.token);
    currentUser = data.user;
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
};

document.getElementById('signup-form').onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const role = document.getElementById('signup-role').value;
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');
  try {
    const data = await API.post('/auth/signup', { name, email, password, role });
    API.setToken(data.token);
    currentUser = data.user;
    showApp();
    toast('Welcome to TaskFlow! 🎉', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
};

document.getElementById('logout-btn').onclick = async () => {
  await API.post('/auth/logout').catch(() => {});
  API.setToken('');
  currentUser = null;
  showAuth();
};

/* ── Navigation ── */
function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  const viewEl = document.getElementById('view-' + view);
  if (viewEl) viewEl.classList.add('active');
  const navEl = document.querySelector(`[data-view="${view}"]`);
  if (navEl) navEl.classList.add('active');
}

document.querySelectorAll('.nav-link').forEach(btn => {
  if (!btn.dataset.view) return;
  btn.onclick = () => {
    const view = btn.dataset.view;
    navigate(view);
    if (view === 'dashboard') loadDashboard();
    else if (view === 'projects') loadProjects();
    else if (view === 'my-tasks') loadMyTasks();
    else if (view === 'team') loadTeam();
  };
});

async function loadAllUsers() {
  try { allUsers = (await API.get('/dashboard/users')).users; } catch {}
}

/* ── Dashboard ── */
function priorityClass(p) { return `badge-${p}`; }
function statusClass(s) { return `badge-${s}`; }

async function loadDashboard() {
  try {
    const data = await API.get('/dashboard/stats');
    document.getElementById('stat-projects').textContent = data.projectCount;
    document.getElementById('stat-total').textContent = data.taskStats?.total || 0;
    document.getElementById('stat-completed').textContent = data.taskStats?.completed || 0;
    document.getElementById('stat-overdue').textContent = data.taskStats?.overdue || 0;

    // Status cards (individual representations)
    const ts = data.taskStats || {};
    const total = ts.total || 0;
    const statuses = [
      { key: 'assigned', label: 'Assigned', color: '#94a3b8' },
      { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
      { key: 'completed', label: 'Completed', color: '#10b981' },
    ];
    
    const container = document.getElementById('status-cards-row');
    if (container) {
      container.innerHTML = statuses.map(s => {
        const count = ts[s.key] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `<div style="display: flex; flex-direction: column; justify-content: space-between;">
          <div style="margin-bottom: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">${s.label}</div>
            <div style="font-size: 24px; font-weight: 800; color: #fff;">${count} <span style="font-size:14px; font-weight:500; color:var(--text-muted)">Tasks</span></div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
              <span style="color: var(--text-muted)">Progress</span>
              <span style="font-weight: 700; color: #fff">${pct}%</span>
            </div>
            <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden;">
              <div style="height: 100%; background: ${s.color}; width: ${pct}%; border-radius: 100px; box-shadow: 0 0 10px ${s.color}44;"></div>
            </div>
          </div>
        </div>`;
      }).join('');
    }

    // Overdue card click handler
    const overdueCard = document.getElementById('overdue-card');
    if (overdueCard) {
      overdueCard.onclick = () => {
        if (data.taskStats?.overdue > 0) {
          document.getElementById('overdue-section')?.scrollIntoView({ behavior: 'smooth' });
        } else {
          toast('WOOWWWW!!!! You dont have any overdue task 🥳', 'success');
        }
      };
    }

    // Overdue list
    const overdueList = document.getElementById('overdue-list');
    if (!data.overdueTasks?.length) {
      overdueList.innerHTML = `<div class="mini-task-item" style="justify-content:center;color:var(--text-2);font-size:13px">✅ No overdue tasks</div>`;
    } else {
      overdueList.innerHTML = data.overdueTasks.map(t => `
        <div class="mini-task-item">
          <div class="mini-task-dot" style="background:var(--red)"></div>
          <div class="mini-task-title">${escHTML(t.title)}</div>
          <span class="mini-task-badge task-badge priority-${t.priority}">${priorityLabel(t.priority)}</span>
          <span class="mini-task-meta">${fmtDate(t.due_date)}</span>
        </div>`).join('');
    }

    // Recent
    const recentList = document.getElementById('recent-list');
    if (!data.recentActivity?.length) {
      recentList.innerHTML = `<div class="mini-task-item" style="justify-content:center;color:var(--text-2);font-size:13px">No recent activity</div>`;
    } else {
      recentList.innerHTML = data.recentActivity.map(t => `
        <div class="mini-task-item">
          <div class="mini-task-dot" style="background:${t.project_color}"></div>
          <div class="mini-task-title">${escHTML(t.title)}</div>
          <span class="mini-task-badge badge badge-${t.status}">${statusLabel(t.status)}</span>
          <span class="mini-task-meta" style="color:${t.project_color}">${escHTML(t.project_name)}</span>
        </div>`).join('');
    }
  } catch (err) { toast('Failed to load dashboard', 'error'); }
}

/* ── Projects ── */
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '<div style="color:var(--text-2);padding:20px">Loading...</div>';
  try {
    const { projects } = await API.get('/projects');
    if (!projects.length) {
      grid.innerHTML = emptyState(
        '<path d="M2 7a2 2 0 012-2h4l2 2h10a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" stroke="currentColor" stroke-width="1.5"/>',
        'No projects yet', 'Create your first project to get started'
      );
      return;
    }
    grid.innerHTML = projects.map(p => renderProjectCard(p)).join('');
    grid.querySelectorAll('.project-card').forEach(card => {
      card.onclick = () => openProject(card.dataset.id);
    });
  } catch { toast('Failed to load projects', 'error'); }
}

function renderProjectCard(p) {
  const pct = p.task_count > 0 ? Math.round((p.completed_count / p.task_count) * 100) : 0;
  const statusBadge = { active: 'badge-in_progress', completed: 'badge-completed', archived: 'badge-assigned' }[p.status];
  return `<div class="card project-card" data-id="${p.id}">
    <div class="p-header">
      <div class="logo-icon" style="background:${p.color};width:44px;height:44px;font-size:18px">${escHTML(p.name[0])}</div>
      <span class="badge ${statusBadge}">${p.status}</span>
    </div>
    <div class="p-title">${escHTML(p.name)}</div>
    <div class="p-desc">${escHTML(p.description || 'No description provided for this project.')}</div>
    <div class="p-footer">
      <div class="flex items-center gap-4" style="font-size:12px;color:var(--text-muted);font-weight:500">
        <span>📋 ${p.task_count} tasks</span>
        <span>👥 ${p.member_count} members</span>
      </div>
      <div class="flex items-center gap-3">
        <span style="font-size:12px;font-weight:700;color:#fff">${pct}%</span>
        <div class="p-progress"><div class="p-progress-bar" style="width:${pct}%;background:${p.color}"></div></div>
      </div>
    </div>
  </div>`;
}

document.getElementById('new-project-btn').onclick = () => {
  if (currentUser.role !== 'admin') {
    return toast('The project can only be created by Admin', 'error');
  }
  showProjectModal();
};

function showProjectModal(project = null) {
  const isEdit = !!project;
  const c = project?.color || '#6366f1';
  Modal.show(isEdit ? 'Edit Project' : 'New Project', `
    <div class="modal-form">
      <div class="input-group"><label>Project Name</label>
        <input type="text" id="proj-name" class="input" placeholder="e.g. Website Redesign" value="${escHTML(project?.name || '')}" /></div>
      <div class="input-group"><label>Description</label>
        <textarea id="proj-desc" class="input" placeholder="What is this project about?" style="min-height:100px">${escHTML(project?.description || '')}</textarea></div>
      <div class="input-group"><label>Theme Color</label>${colorPicker(c, 'proj-color')}</div>
      ${isEdit ? `<div class="input-group"><label>Status</label><select id="proj-status" class="input">
        <option value="active"${project.status==='active'?' selected':''}>Active</option>
        <option value="completed"${project.status==='completed'?' selected':''}>Completed</option>
        <option value="archived"${project.status==='archived'?' selected':''}>Archived</option>
      </select></div>` : ''}
      <div class="modal-actions mt-4">
        <button class="btn btn-ghost" onclick="Modal.hide()">Cancel</button>
        <button class="btn btn-primary" onclick="saveProject(${project?.id||'null'})">
          ${isEdit ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </div>
  `);
  document.getElementById('proj-name').focus();
}

async function saveProject(id) {
  const name = document.getElementById('proj-name').value.trim();
  const description = document.getElementById('proj-desc').value;
  const color = document.getElementById('proj-color-val')?.value || '#6366f1';
  const status = document.getElementById('proj-status')?.value;
  if (!name) return toast('Project name is required', 'error');
  try {
    if (id) {
      await API.put(`/projects/${id}`, { name, description, color, status });
      toast('Project updated!', 'success');
    } else {
      await API.post('/projects', { name, description, color });
      toast('Project created!', 'success');
    }
    if (id && currentProject?.id === id) {
      openProject(id);
    } else {
      loadProjects();
    }
    Modal.hide();
  } catch (err) { toast(err.message, 'error'); }
}

/* ── Project Detail ── */
async function openProject(id) {
  try {
    const { project, members } = await API.get(`/projects/${id}`);
    currentProject = { ...project, members };
    navigate('project-detail');

    // Update project info
    const infoEl = document.getElementById('project-detail-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:10px;height:10px;border-radius:50%;background:${project.color}"></div>
          <div>
            <div class="project-detail-name">${escHTML(project.name)}</div>
            <div class="project-detail-desc">${escHTML(project.description || '')}</div>
          </div>
        </div>
      `;
    }

    // Add Edit/Delete buttons if admin
    const actionsEl = document.getElementById('project-actions-admin');
    if (actionsEl) {
      actionsEl.innerHTML = currentUser.role === 'admin' ? `
        <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation();showProjectModal(currentProject)">✏️ Edit</button>
        <button class="btn btn-danger" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation();deleteProject()">🗑 Delete</button>
      ` : '';
    }

    await loadProjectTasks();
  } catch (err) { toast(err.message, 'error'); }
}

const backBtn = document.getElementById('back-to-projects');
if (backBtn) backBtn.onclick = () => { navigate('projects'); loadProjects(); };

// Filters
['filter-status', 'filter-priority'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onchange = loadProjectTasks;
});

const listBtn = document.getElementById('list-view-btn');
const kanbanBtn = document.getElementById('kanban-view-btn');
if (listBtn) listBtn.onclick = () => {
  listBtn.classList.add('active');
  if (kanbanBtn) kanbanBtn.classList.remove('active');
  const lv = document.getElementById('tasks-list-view');
  const kv = document.getElementById('tasks-kanban-view');
  if (lv) lv.classList.remove('hidden');
  if (kv) kv.classList.add('hidden');
};
if (kanbanBtn) kanbanBtn.onclick = () => {
  kanbanBtn.classList.add('active');
  if (listBtn) listBtn.classList.remove('active');
  const lv = document.getElementById('tasks-list-view');
  const kv = document.getElementById('tasks-kanban-view');
  if (kv) kv.classList.remove('hidden');
  if (lv) lv.classList.add('hidden');
  renderKanban();
};

let currentTasks = [];

async function loadProjectTasks() {
  if (!currentProject) return;
  const status = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  let url = `/tasks/project/${currentProject.id}`;
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (params.toString()) url += '?' + params.toString();

  try {
    const { tasks } = await API.get(url);
    currentTasks = tasks;
    renderTasksList(tasks);
    if (!document.getElementById('tasks-kanban-view').classList.contains('hidden')) renderKanban();
  } catch (err) { toast('Failed to load tasks', 'error'); }
}

function renderTasksList(tasks) {
  const container = document.getElementById('tasks-list-view');
  if (!tasks.length) {
    container.innerHTML = emptyState(
      '<path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'No tasks', 'Add your first task to get started'
    );
    return;
  }
  container.innerHTML = tasks.map(t => renderTaskCard(t)).join('');
  container.querySelectorAll('.task-card').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('.task-actions') || e.target.closest('.task-checkbox')) return;
      openTaskDetail(card.dataset.id);
    };
  });
  container.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.onclick = () => toggleTaskDone(cb.dataset.id, cb.dataset.status);
  });
  container.querySelectorAll('[data-action="edit"]').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); showTaskModal(currentTasks.find(t => t.id == btn.dataset.id)); });
  container.querySelectorAll('[data-action="delete"]').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); deleteTask(btn.dataset.id); });
}

function renderTaskCard(t) {
  const isAssignee = t.assignee_id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';
  const canModify = isAdmin || (t.creator_id === currentUser.id && currentUser.role !== 'member');
  const canUpdateStatus = isAdmin || isAssignee;
  
  const nextStatus = {
    'assigned': 'in_progress',
    'in_progress': 'completed'
  }[t.status] || null;

  const overdue = t.is_overdue;
  
  return `<div class="task-item ${overdue ? 'overdue' : ''}" data-id="${t.id}" onclick="openTaskDetail('${t.id}')">
    <div style="flex: 1; overflow: hidden; padding-right: 20px;">
      <div class="task-name ${t.status === 'completed' ? 'done' : ''}">${escHTML(t.title)}</div>
      <div class="task-meta">
        <span class="badge badge-${t.priority}" style="font-size: 9px;">${priorityLabel(t.priority)}</span>
        <span class="badge badge-${t.status}" style="font-size: 9px;">${statusLabel(t.status)}</span>
        ${t.assignee_name ? `<div class="flex items-center gap-1.5" style="color:var(--text-muted)">
          <div style="width:16px;height:16px;border-radius:50%;background:${t.assignee_color};display:flex;align-items:center;justify-content:center;font-size:8px;color:white;font-weight:800">${initials(t.assignee_name)}</div>
          <span>${escHTML(t.assignee_name)}</span>
        </div>` : ''}
        ${t.due_date ? `<span class="flex items-center gap-1 ${overdue ? 'color:var(--red)' : ''}" style="font-size: 11px;">📅 ${fmtDate(t.due_date)}</span>` : ''}
      </div>
    </div>
    <div class="flex items-center gap-3">
      ${canUpdateStatus && nextStatus ? `
        <button class="btn btn-primary" style="padding:6px 14px; font-size:11px; height: 32px;" onclick="event.stopPropagation();updateTaskStatus('${t.id}', '${nextStatus}')">
          Mark ${statusLabel(nextStatus)}
        </button>
      ` : ''}
      ${canModify ? `
        <button class="btn-ghost" style="padding: 8px; border-radius: 8px; border: 1px solid var(--border);" onclick="event.stopPropagation();showTaskModal(${JSON.stringify(t).replace(/"/g,'&quot;')})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      ` : ''}
    </div>
  </div>`;
}

function renderKanban() {
  const cols = [
    { key: 'assigned', label: 'Assigned', color: '#94a3b8' },
    { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
    { key: 'completed', label: 'Completed', color: '#10b981' },
  ];
  const board = document.getElementById('kanban-board');
  board.innerHTML = cols.map(col => {
    const tasks = currentTasks.filter(t => t.status === col.key);
    return `<div class="kanban-col">
      <div class="kanban-col-header">
        <div class="kanban-col-title">
          <span style="width:8px;height:8px;border-radius:50%;background:${col.color};display:inline-block"></span>
          ${col.label}
        </div>
        <span class="kanban-col-count">${tasks.length}</span>
      </div>
      <div class="kanban-tasks" id="kanban-${col.key}">
        ${tasks.length ? tasks.map(t => `
          <div class="kanban-task" data-id="${t.id}" onclick="openTaskDetail(${t.id})">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <span class="task-badge ${priorityClass(t.priority)}" style="font-size:10px">${priorityLabel(t.priority)}</span>
              ${t.is_overdue ? '<span style="font-size:10px;color:var(--red)">Overdue</span>' : ''}
            </div>
            <div class="kanban-task-title">${escHTML(t.title)}</div>
            <div class="kanban-task-footer">
              ${t.assignee_name ? `<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-2)">
                <span style="width:20px;height:20px;border-radius:50%;background:${t.assignee_color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:700">${initials(t.assignee_name)}</span>
                ${escHTML(t.assignee_name)}</span>` : '<span></span>'}
              ${t.due_date ? `<span style="font-size:10px;color:var(--text-3)">📅${fmtDate(t.due_date)}</span>` : ''}
            </div>
          </div>`).join('') : `<div style="text-align:center;padding:24px;color:var(--text-3);font-size:12px">No tasks</div>`}
      </div>
    </div>`;
  }).join('');
}

async function updateTaskStatus(id, newStatus) {
  try {
    await API.put(`/tasks/${id}`, { status: newStatus });
    if (document.getElementById('view-dashboard').classList.contains('active')) loadDashboard();
    else if (document.getElementById('view-my-tasks').classList.contains('active')) loadMyTasks();
    else loadProjectTasks();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteTask(id) {
  Modal.confirm('Delete Task', 'Are you sure you want to delete this task? This action cannot be undone.', async () => {
    try {
      await API.delete(`/tasks/${id}`);
      toast('Task deleted', 'success');
      if (document.getElementById('view-dashboard').classList.contains('active')) loadDashboard();
      else if (document.getElementById('view-projects').classList.contains('active')) loadProjectTasks();
      else loadMyTasks();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ── Task Modal ── */
document.getElementById('new-task-btn').onclick = () => showTaskModal();

function showTaskModal(task = null) {
  const isEdit = !!task;
  const members = currentProject?.members || [];
  Modal.show(isEdit ? 'Edit Task' : 'New Task', `
    <div class="modal-form">
      <div class="input-group"><label>Task Title</label>
        <input type="text" id="task-title" class="input" placeholder="e.g. Design homepage" value="${escHTML(task?.title || '')}" /></div>
      <div class="input-group"><label>Description</label>
        <textarea id="task-desc" class="input" placeholder="What needs to be done?" style="min-height:80px">${escHTML(task?.description || '')}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="input-group"><label>Status</label><select id="task-status" class="input">
          <option value="assigned"${task?.status==='assigned'?' selected':''}>Assigned</option>
          <option value="in_progress"${task?.status==='in_progress'?' selected':''}>In Progress</option>
          <option value="completed"${task?.status==='completed'?' selected':''}>Completed</option>
        </select></div>
        <div class="input-group"><label>Priority</label><select id="task-priority" class="input">
          <option value="low"${task?.priority==='low'?' selected':''}>Low</option>
          <option value="medium"${task?.priority==='medium'||!task?' selected':''}>Medium</option>
          <option value="high"${task?.priority==='high'?' selected':''}>High</option>
          <option value="critical"${task?.priority==='critical'?' selected':''}>Critical</option>
        </select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="input-group"><label>Assignee</label><select id="task-assignee" class="input">
          <option value="">Unassigned</option>
          ${members.map(m => `<option value="${m.id}"${task?.assignee_id===m.id?' selected':''}>${escHTML(m.name)}</option>`).join('')}
        </select></div>
        <div class="input-group"><label>Due Date</label>
          <input type="date" id="task-due" class="input" value="${task?.due_date||''}" /></div>
      </div>
      <div class="modal-actions mt-4">
        <button class="btn btn-ghost" onclick="Modal.hide()">Cancel</button>
        <button class="btn btn-primary" onclick="saveTask('${task?.id || ''}')">
          ${isEdit ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </div>
  `);
  document.getElementById('task-title').focus();
}

async function saveTask(id) {
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value;
  const status = document.getElementById('task-status').value;
  const priority = document.getElementById('task-priority').value;
  const assignee_id = document.getElementById('task-assignee').value || null;
  const due_date = document.getElementById('task-due').value || null;
  if (!title) return toast('Task title is required', 'error');

  try {
    if (id) {
      await API.put(`/tasks/${id}`, { title, description, status, priority, assignee_id, due_date });
      toast('Task updated!', 'success');
    } else {
      await API.post('/tasks', { title, description, status, priority, project_id: currentProject.id, assignee_id, due_date });
      toast('Task created!', 'success');
    }
    Modal.hide();
    if (document.getElementById('view-dashboard').classList.contains('active')) loadDashboard();
    else loadProjectTasks();
  } catch (err) { toast(err.message, 'error'); }
}

/* ── Task Detail ── */
async function openTaskDetail(id) {
  const task = currentTasks.find(t => t.id == id);
  if (!task) return;

  const nextStatus = {'assigned':'in_progress','in_progress':'completed'}[task.status];

  Modal.show(escHTML(task.title), `
    <div>
      <div class="flex gap-2 items-center" style="margin-bottom:20px; flex-wrap:wrap">
        <span class="badge badge-${task.priority}">${priorityLabel(task.priority)}</span>
        <span class="badge badge-${task.status}">${statusLabel(task.status)}</span>
        ${task.due_date ? `<span class="badge ${task.is_overdue?'badge-critical':''}">📅 ${fmtDate(task.due_date)}</span>` : ''}
        ${(currentUser.role === 'admin' || task.assignee_id === currentUser.id) && nextStatus ? `
          <button class="btn btn-secondary" style="padding:4px 10px; font-size:11px" onclick="Modal.hide();updateTaskStatus('${task.id}', '${nextStatus}')">
            Mark ${statusLabel(nextStatus)}
          </button>
        ` : ''}
      </div>
      
      ${task.description ? `<p style="font-size:15px;color:var(--text-main);line-height:1.6;margin-bottom:24px">${escHTML(task.description)}</p>` : ''}
      
      <div class="card" style="background:var(--surface-2); padding:16px; margin-bottom:24px">
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2 font-size:13px">
            <span style="color:var(--text-muted);width:80px">Creator:</span>
            <span style="font-weight:600">${escHTML(task.creator_name)}</span>
          </div>
          <div class="flex items-center gap-2 font-size:13px">
            <span style="color:var(--text-muted);width:80px">Assignee:</span>
            <span style="font-weight:600">${task.assignee_name ? escHTML(task.assignee_name) : 'Unassigned'}</span>
          </div>
          <div class="flex items-center gap-2 font-size:13px">
            <span style="color:var(--text-muted);width:80px">Project:</span>
            <span style="font-weight:600;color:${task.project_color}">${escHTML(task.project_name)}</span>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mb-8">
        ${(currentUser.role === 'admin' || (task.creator_id === currentUser.id && currentUser.role !== 'member')) ? `
          <button class="btn btn-secondary" style="flex:1" onclick="Modal.hide();showTaskModal(${JSON.stringify(task).replace(/"/g,'&quot;')})">✏️ Edit</button>
          <button class="btn btn-danger" style="flex:1" onclick="event.stopPropagation();Modal.hide();deleteTask('${task.id}')">🗑 Delete</button>
        ` : ''}
      </div>

      <div class="comments-section">
        <h4 style="font-family:var(--font-display);font-size:16px;margin-bottom:16px">Team Comments</h4>
        <div class="comment-list" id="comment-list-${id}" style="margin-bottom:16px">
          <div style="font-size:12px;color:var(--text-muted)">Loading comments...</div>
        </div>
        <div class="flex gap-2">
          <input type="text" id="comment-input-${id}" class="input" placeholder="Write a comment..." style="flex:1" />
          <button class="btn btn-primary" onclick="addComment('${id}')">Send</button>
        </div>
      </div>
    </div>
  `);
  document.getElementById(`comment-input-${id}`).onkeydown = (e) => { if (e.key === 'Enter') addComment(id); };
  loadComments(id);
}

async function loadComments(taskId) {
  try {
    const { comments } = await API.get(`/tasks/${taskId}/comments`);
    const el = document.getElementById(`comment-list-${taskId}`);
    if (!el) return;
    if (!comments.length) { el.innerHTML = `<div style="font-size:12px;color:var(--text-3)">No comments yet. Be the first!</div>`; return; }
    el.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-avatar" style="background:${c.avatar_color}">${initials(c.user_name)}</div>
        <div class="comment-body">
          <div class="comment-meta"><strong>${escHTML(c.user_name)}</strong> · ${new Date(c.created_at).toLocaleDateString()}</div>
          <div class="comment-text">${escHTML(c.content)}</div>
        </div>
      </div>`).join('');
  } catch {}
}

async function addComment(taskId) {
  const input = document.getElementById(`comment-input-${taskId}`);
  const content = input?.value?.trim();
  if (!content) return;
  try {
    await API.post(`/tasks/${taskId}/comments`, { content });
    input.value = '';
    loadComments(taskId);
    if (document.getElementById('view-dashboard').classList.contains('active')) loadDashboard();
  } catch (err) { toast(err.message, 'error'); }
}

/* ── Members & Task Actions ── */
const membersBtn = document.getElementById('project-members-btn');
if (membersBtn) membersBtn.onclick = () => showMembersModal();

const newTaskBtn = document.getElementById('new-task-btn');
if (newTaskBtn) newTaskBtn.onclick = () => showTaskModal();

function showMembersModal() {
  const members = currentProject?.members || [];
  Modal.show('Project Members', `
    <div style="width:100%">
      <div class="members-list" id="members-list" style="display:flex; flex-direction:column; gap:12px; max-height:300px; overflow-y:auto; margin-bottom:24px; padding-right:4px">
        ${members.map(m => `
          <div class="member-item flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div class="member-avatar-sm" style="width:36px;height:36px;border-radius:50%;background:${m.avatar_color || 'var(--accent)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:white;flex-shrink:0">
              ${initials(m.name)}
            </div>
            <div class="member-info" style="flex:1; overflow:hidden">
              <div class="member-name" style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHTML(m.name)}</div>
              <div class="member-email" style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHTML(m.email)}</div>
            </div>
            <span class="badge ${m.project_role === 'admin' ? 'badge-in_progress' : 'badge-assigned'}" style="font-size:9px">
              ${m.project_role || 'member'}
            </span>
            ${m.id !== currentUser.id ? `
              <button class="btn-ghost" style="padding:6px; color:var(--red)" onclick="removeMember('${m.id}')" title="Remove Member">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            ` : ''}
          </div>`).join('')}
      </div>
      
      <div style="border-top:1px solid var(--border); padding-top:20px">
        <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px">Add New Member</div>
        <div class="flex gap-2">
          <input type="email" id="add-member-email" class="input" placeholder="member@company.com" style="flex:1" />
          <button class="btn btn-primary" onclick="addMember()">Add</button>
        </div>
      </div>
    </div>
  `);
}

async function addMember() {
  const email = document.getElementById('add-member-email').value.trim();
  if (!email) return;
  try {
    await API.post(`/projects/${currentProject.id}/members`, { email });
    toast('Member added!', 'success');
    openProject(currentProject.id); // Refresh
    Modal.hide();
  } catch (err) { toast(err.message, 'error'); }
}

async function removeMember(userId) {
  Modal.confirm('Remove Member', 'Are you sure you want to remove this member from the project?', async () => {
    try {
      await API.delete(`/projects/${currentProject.id}/members/${userId}`);
      toast('Member removed', 'success');
      openProject(currentProject.id); // Refresh
    } catch (err) { toast(err.message, 'error'); }
  });
}


async function deleteProject() {
  Modal.confirm('Delete Project', 'Are you sure? This will permanently delete the project and ALL its tasks!', async () => {
    try {
      await API.delete(`/projects/${currentProject.id}`);
      toast('Project deleted', 'success');
      navigate('projects');
      loadProjects();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ── My Tasks ── */
async function loadMyTasks() {
  const container = document.getElementById('my-tasks-container');
  container.innerHTML = '<div style="color:var(--text-2);padding:20px">Loading...</div>';
  try {
    const { tasks } = await API.get('/tasks/my');
    if (!tasks.length) {
      container.innerHTML = emptyState(
        '<path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="1.5"/>',
        'No tasks assigned', 'Tasks assigned to you will appear here'
      );
      return;
    }
    container.innerHTML = tasks.map(t => renderTaskCard(t)).join('');
    container.querySelectorAll('.task-card').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('.task-actions') || e.target.closest('.btn-mini-status')) return;
        openTaskDetail(card.dataset.id);
      };
    });
  } catch { toast('Failed to load tasks', 'error'); }
}

/* ── Team ── */
async function loadTeam() {
  const grid = document.getElementById('team-grid');
  grid.innerHTML = '<div style="color:var(--text-2);padding:20px">Loading...</div>';
  try {
    const isAdmin = currentUser.role === 'admin';
    const { users } = await API.get('/dashboard/users');
    grid.innerHTML = users.map(u => {
      const isApproved = u.isApproved !== false;
      return `
      <div class="card" style="text-align:center">
        <div style="margin: 0 auto 16px">${avatar(u.name, u.avatar_color, 48)}</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:4px">${escHTML(u.name)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${escHTML(u.email)}</div>
        <div class="flex flex-col gap-2 items-center">
          <span class="badge ${u.role === 'admin' ? 'badge-in_progress' : 'badge-completed'}">${u.role}</span>
          ${isAdmin && !isApproved ? `
            <div class="flex gap-2 mt-2">
              <button class="btn btn-primary" style="padding:6px 12px;font-size:11px" onclick="event.stopPropagation();approveUser('${u.id}')">Approve</button>
              <button class="btn btn-danger" style="padding:6px 12px;font-size:11px" onclick="event.stopPropagation();rejectUser('${u.id}')">Reject</button>
            </div>
          ` : (isAdmin && isApproved && u.id !== currentUser.id ? `
            <button class="btn btn-danger mt-2" style="padding:6px 12px;font-size:11px" onclick="event.stopPropagation();rejectUser('${u.id}')">Revoke Approval</button>
          ` : (isApproved ? '' : '<span style="font-size:11px;color:var(--warning)">Pending Approval</span>'))}
        </div>
      </div>`;
    }).join('');
  } catch (err) { toast('Failed to load team', 'error'); }
}

async function approveUser(id) {
  try {
    await API.patch(`/admin/users/${id}/approve`);
    toast('User approved!', 'success');
    loadTeam();
  } catch (err) { toast(err.message, 'error'); }
}

async function rejectUser(id) {
  Modal.confirm('Revoke Approval', 'Are you sure you want to reject or revoke approval for this user?', async () => {
    try {
      await API.patch(`/admin/users/${id}/reject`);
      toast('User updated', 'success');
      loadTeam();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ── Utils ── */
function escHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Boot ── */
init();
