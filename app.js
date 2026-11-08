let API, HEADERS;
let editingId = null;

const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-description');
const submitBtn = document.getElementById('task-submit');
const list = document.getElementById('task-list');
const statusEl = document.getElementById('status-message');

function showStatus(msg) { statusEl.textContent = msg || ''; }

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { ...HEADERS, ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

async function loadTasks() {
  try {
    const tasks = await api('?select=*&order=id.asc');
    render(tasks);
    showStatus('');
  } catch (e) {
    showStatus('Could not load tasks: ' + e.message);
  }
}

function render(tasks) {
  list.innerHTML = '';
  tasks.forEach(t => {
    const item = document.createElement('div');
    item.className = 'task-item' + (t.completed ? ' done' : '');
    item.dataset.id = t.id;

    const title = document.createElement('strong');
    title.className = 'task-title';
    title.textContent = t.title;

    const desc = document.createElement('p');
    desc.className = 'task-description';
    desc.textContent = t.description || '';

    const status = document.createElement('span');
    status.className = 'task-status';
    status.textContent = t.completed ? 'Completed' : 'Incomplete';

    const toggle = button('toggle-task', t.completed ? 'Mark incomplete' : 'Mark complete',
      () => run(() => api(`?id=eq.${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !t.completed })
      })));

    const edit = button('edit-task', 'Edit', () => {
      editingId = t.id;
      titleInput.value = t.title;
      descInput.value = t.description || '';
      submitBtn.textContent = 'Save task';
      titleInput.focus();
    });

    const del = button('delete-task', 'Delete',
      () => run(() => api(`?id=eq.${t.id}`, { method: 'DELETE' })));

    item.append(title, desc, status, ' ', toggle, edit, del);
    list.appendChild(item);
  });
}

function button(cls, text, handler) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  b.addEventListener('click', handler);
  return b;
}

async function run(action) {
  try { await action(); await loadTasks(); }
  catch (e) { showStatus('Operation failed: ' + e.message); }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const body = JSON.stringify({
    title: titleInput.value.trim(),
    description: descInput.value.trim()
  });
  const json = { 'Content-Type': 'application/json' };
  await run(() => editingId
    ? api(`?id=eq.${editingId}`, { method: 'PATCH', headers: json, body })
    : api('', { method: 'POST', headers: json, body }));
  editingId = null;
  form.reset();
  submitBtn.textContent = 'Add task';
});

(async function init() {
  try {
    const cfg = await (await fetch('config.json')).json();
    API = `${cfg.supabaseUrl}/rest/v1/${cfg.tableName}`;
    HEADERS = { apikey: cfg.supabasePublishableKey };
    loadTasks();
  } catch (e) {
    showStatus('Could not load configuration: ' + e.message);
  }
})();