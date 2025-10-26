/* ---------- Data & State ---------- */
let tasks = [];
let role = '';
let currentUser = '';
let editId = null;

/* ---------- Init ---------- */
window.addEventListener('load', () => {
  loadTasks();
  setInterval(checkReminders, 60000); // check every minute
  // restore theme from localStorage
  if (localStorage.getItem('uniTheme') === 'dark') document.body.classList.add('dark');
});

/* ---------- Role selection ---------- */
function selectRole(selected) {
  role = selected;
  currentUser = prompt(`Enter your name (for ${role}):`) || role;
  document.getElementById('role-title').textContent = `Welcome, ${role}`;
  document.getElementById('welcome').textContent = currentUser;
  document.getElementById('role-panel').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  // focus input
  document.getElementById('task-title').focus();
  renderList();
  updateSummary();
}

/* ---------- Add / Save Task ---------- */
function addTask() {
  const titleEl = document.getElementById('task-title');
  const dateEl = document.getElementById('task-date');
  const prioEl = document.getElementById('task-priority');

  const title = titleEl.value.trim();
  const date = dateEl.value;
  const priority = prioEl.value;

  if (!title || !date) {
    alert('Please enter a title and date.');
    return;
  }

  if (editId !== null) {
    // Save edit
    const t = tasks.find(x => x.id === editId);
    if (!t) { alert('Task not found'); cancelEdit(); return; }
    t.title = title;
    t.date = date;
    t.priority = priority;
    editId = null;
    toggleEditUI(false);
  } else {
    // New task
    const newTask = {
      id: Date.now(),
      title, date, priority,
      done: false,
      user: currentUser,
      role: role
    };
    tasks.push(newTask);
  }

  saveTasks();
  clearForm();
  renderList();
  updateSummary();
}

/* ---------- Render / Search ---------- */
function searchTasks() {
  const q = document.getElementById('search').value.toLowerCase();
  const filtered = tasks.filter(t =>
    t.user === currentUser && (t.title.toLowerCase().includes(q) || t.date.includes(q) || t.priority.toLowerCase().includes(q))
  );
  renderList(filtered);
}

function renderList(filteredTasks) {
  const container = document.getElementById('task-list');
  container.innerHTML = '';

  const list = Array.isArray(filteredTasks) ? filteredTasks : tasks.filter(t => t.user === currentUser);
  if (list.length === 0) {
    container.innerHTML = `<div class="task-item"><div class="task-left"><b>No tasks yet</b><div class="meta">Add your first task</div></div></div>`;
    renderCalendar([]);
    return;
  }

  // sort by date ascending
  list.sort((a,b) => new Date(a.date) - new Date(b.date));

  list.forEach(task => {
    const row = document.createElement('div');
    row.className = `task-item priority-${task.priority || 'Normal'}`;

    // left block
    const left = document.createElement('div');
    left.className = 'task-left';
    const title = document.createElement('div');
    title.innerHTML = `<b>${escapeHtml(task.title)}</b> ${task.done ? '✅' : ''}`;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `Due: ${task.date} • ${task.priority}`;

    left.appendChild(title);
    left.appendChild(meta);

    // right block (buttons)
    const right = document.createElement('div');
    right.className = 'task-right';

    const doneBtn = document.createElement('button');
    doneBtn.className = 'task-btn done';
    doneBtn.title = task.done ? 'Mark as Undone' : 'Mark as Done';
    doneBtn.innerHTML = task.done ? '↩' : '✔';
    doneBtn.onclick = () => { toggleDone(task.id); };

    const editBtn = document.createElement('button');
    editBtn.className = 'task-btn edit';
    editBtn.title = 'Edit task';
    editBtn.innerHTML = '✏';
    editBtn.onclick = () => { startEdit(task.id); };

    const delBtn = document.createElement('button');
    delBtn.className = 'task-btn delete';
    delBtn.title = 'Delete task';
    delBtn.innerHTML = '🗑';
    delBtn.onclick = () => { deleteTask(task.id); };

    right.append(doneBtn, editBtn, delBtn);

    row.append(left, right);
    container.appendChild(row);
  });

  renderCalendar(list);
}

/* ---------- Toggle Done ---------- */
function toggleDone(id) {
  const t = tasks.find(x => x.id === id);
  if (t) t.done = !t.done;
  saveTasks();
  renderList();
  updateSummary();
}

/* ---------- Edit flow ---------- */
function startEdit(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return alert('Task not found');

  document.getElementById('task-title').value = t.title;
  document.getElementById('task-date').value = t.date;
  document.getElementById('task-priority').value = t.priority || 'Normal';
  editId = id;
  toggleEditUI(true);
  document.getElementById('task-title').focus();
}

function cancelEdit() {
  editId = null;
  toggleEditUI(false);
  clearForm();
}

function toggleEditUI(isEditing) {
  const addBtn = document.getElementById('addBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  if (isEditing) {
    addBtn.textContent = '💾 Save';
    addBtn.classList.remove('primary');
    addBtn.classList.add('accent');
    cancelBtn.classList.remove('hidden');
  } else {
    addBtn.textContent = '➕ Add Task';
    addBtn.classList.remove('accent');
    addBtn.classList.add('primary');
    cancelBtn.classList.add('hidden');
  }
}

/* ---------- Delete ---------- */
function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(x => x.id !== id);
  saveTasks();
  renderList();
  updateSummary();
}

/* ---------- Clear Completed ---------- */
function clearCompleted() {
  if (!confirm('Clear all completed tasks?')) return;
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  renderList();
  updateSummary();
}

/* ---------- Export / Import ---------- */
function exportTasks() {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Edulink_tasks.json';
  a.click();
}

function importTasks(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid file');
      // merge or replace? We will append imported tasks (avoid duplicate ids)
      const existingIds = new Set(tasks.map(t => t.id));
      imported.forEach(t => {
        // basic validation
        if (!t.id || !t.title || !t.date) return;
        if (!existingIds.has(t.id)) tasks.push(t);
      });
      saveTasks();
      renderList();
      updateSummary();
      alert('Tasks imported.');
    } catch {
      alert('Failed to import. Please use a valid JSON exported from this app.');
    }
  };
  reader.readAsText(file);
}

/* ---------- Save / Load ---------- */
function saveTasks() {
  localStorage.setItem('uniTasks', JSON.stringify(tasks));
}
function loadTasks() {
  const raw = localStorage.getItem('uniTasks');
  if (raw) {
    try { tasks = JSON.parse(raw); } catch { tasks = []; }
  }
}

/* ---------- Summary / Progress / Calendar ---------- */
function updateSummary() {
  const userTasks = tasks.filter(t => t.user === currentUser);
  const total = userTasks.length;
  const done = userTasks.filter(t => t.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('summary-content').textContent = `Total: ${total} | Completed: ${done} (${percent}%)`;
  document.getElementById('progress').style.width = percent + '%';
}

function renderCalendar(userTasks) {
  const cal = document.getElementById('calendar-list');
  cal.innerHTML = '';
  // show next 6 items
  const sorted = (userTasks || tasks.filter(t => t.user === currentUser)).slice().sort((a,b)=> new Date(a.date) - new Date(b.date));
  sorted.slice(0,6).forEach(t => {
    const li = document.createElement('li');
    li.textContent = `${t.date} — ${t.title} (${t.priority})${t.done ? ' ✅' : ''}`;
    cal.appendChild(li);
  });
}

/* ---------- Reminders (alerts for today) ---------- */
function checkReminders() {
  const today = new Date().toISOString().slice(0,10);
  const dueToday = tasks.filter(t => !t.done && t.date === today && t.user === currentUser);
  if (dueToday.length > 0) {
    // use more friendly single alert rather than multiple alerts
    alert(`Reminder: ${dueToday.length} task(s) due today!`);
  }
}

/* ---------- Form helpers ---------- */
function clearForm() {
  document.getElementById('task-title').value = '';
  document.getElementById('task-date').value = '';
  document.getElementById('task-priority').value = 'Normal';
}

/* ---------- Theme & Role ---------- */
function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem('uniTheme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function changeRole() {
  // reset small state and show role panel
  role = '';
  currentUser = '';
  editId = null;
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('role-panel').classList.remove('hidden');
  clearForm();
  renderList([]);
}

/* ---------- Utility ---------- */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}
