/* ── Toast ── */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  const container = document.getElementById('toast-container');
  if (!container) return;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-20px)';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/* ── Modal ── */
const Modal = {
  show(title, bodyHTML) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
  },
  hide() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
    document.getElementById('modal-body').innerHTML = '';
  },
  confirm(title, message, onConfirm) {
    this.show(title, `
      <div style="text-align:center;padding:10px 0">
        <p style="color:var(--text-muted);margin-bottom:28px;font-size:15px;line-height:1.6">${message}</p>
        <div class="flex gap-4 justify-between">
          <button class="btn btn-secondary" style="flex:1" onclick="Modal.hide()">Cancel</button>
          <button class="btn btn-danger" style="flex:1" id="confirm-action-btn">Confirm</button>
        </div>
      </div>
    `);
    document.getElementById('confirm-action-btn').onclick = async () => {
      const btn = document.getElementById('confirm-action-btn');
      btn.disabled = true;
      btn.innerHTML = 'Processing...';
      await onConfirm();
      this.hide();
    };
  }
};

document.getElementById('modal-close').onclick = () => Modal.hide();
document.getElementById('modal-overlay').onclick = (e) => { 
  if (e.target === document.getElementById('modal-overlay')) Modal.hide(); 
};

/* ── Helpers ── */
function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

function avatar(name, color, size = 32) {
  return `<div class="logo-icon" style="width:${size}px;height:${size}px;font-size:${Math.floor(size/2.5)}px;background:${color||'var(--primary)'};box-shadow:none">${initials(name)}</div>`;
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function priorityLabel(p) {
  return { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }[p] || p;
}

function statusLabel(s) {
  return { assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed' }[s] || s;
}

function colorPicker(selected, inputId) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#a855f7'];
  return `<div class="color-picker" id="${inputId}" style="margin-top:8px">
    ${colors.map(c => `<div class="color-swatch${c === selected ? ' selected' : ''}" style="background:${c}" data-color="${c}" onclick="selectColor('${inputId}',this)"></div>`).join('')}
    <input type="hidden" id="${inputId}-val" value="${selected || colors[0]}">
  </div>`;
}

function selectColor(containerId, el) {
  document.querySelectorAll(`#${containerId} .color-swatch`).forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById(containerId + '-val').value = el.dataset.color;
}

function taskPriorityBar(p) {
  const colors = { critical: '#da3633', high: '#d29922', medium: '#d29922', low: '#238636' };
  return `background:${colors[p] || 'var(--primary)'}`;
}

function emptyState(icon, title, desc) {
  return `<div class="empty-state">
    <div style="font-size:48px;margin-bottom:16px;opacity:0.3">${icon}</div>
    <h3>${title}</h3>
    <p>${desc}</p>
  </div>`;
}
