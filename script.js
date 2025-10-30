let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

document.addEventListener("DOMContentLoaded", () => {
  renderTasks();
  updateSummary();
  setupNavigation();
});

function setupNavigation() {
  const links = document.querySelectorAll("nav a");
  const sections = document.querySelectorAll("main section");

  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      const target = link.textContent.trim().toLowerCase().replace(" ", "");
      sections.forEach(sec => sec.style.display = "none");

      if (target.includes("dashboard")) document.getElementById("dashboard").style.display = "block";
      else if (target.includes("addtask")) document.getElementById("addTask").style.display = "block";
      else {
        document.getElementById("projects").style.display = "block";

        // ===== CATEGORY FILTERING ADDED HERE =====
        if (target.includes("project")) renderTasks("Project");
        else if (target.includes("assignment")) renderTasks("Assignment");
        else if (target.includes("exam")) renderTasks("Exam");
        else if (target.includes("activity")) renderTasks("Activity");
        else if (target.includes("completed")) renderTasks("Completed");
        else renderTasks(); // show all
      }
    });
  });
}

// ===== ADD TASK =====
document.getElementById("taskForm").addEventListener("submit", e => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const subject = document.getElementById("subject").value.trim();
  const due = document.getElementById("due").value;
  const priority = document.getElementById("priority").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value.trim();

  if (!title || !subject || !due || !category) {
    document.getElementById("formAlert").classList.remove("hidden");
    return;
  }
  document.getElementById("formAlert").classList.add("hidden");

  const task = { id: Date.now(), title, subject, due, priority, category, description, status: "Pending" };
  tasks.push(task);
  localStorage.setItem("tasks", JSON.stringify(tasks));

  renderTasks();
  updateSummary();
  e.target.reset();
});

function renderTasks(filterCategory = null) {
  const tbody = document.querySelector("#taskTable tbody");
  tbody.innerHTML = "";

  // ===== FILTER LOGIC ADDED =====
  let filteredTasks = tasks;
  if (filterCategory && filterCategory !== "Completed") {
    filteredTasks = tasks.filter(t => t.category === filterCategory);
  } else if (filterCategory === "Completed") {
    filteredTasks = tasks.filter(t => t.status === "Completed");
  }

  if (filteredTasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:#777;">No tasks yet</td></tr>`;
    return;
  }

  filteredTasks.forEach(t => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.title}</td>
      <td>${t.subject}</td>
      <td>${t.due}</td>
      <td>${t.priority}</td>
      <td>${t.category}</td>
      <td>${t.description}</td>
      <td>${t.status}</td>
      <td>
        <button onclick="markDone(${t.id})">✅</button>
        <button onclick="editTask(${t.id})">✏️</button>
        <button onclick="deleteTask(${t.id})">🗑️</button>
      </td>`;
    tbody.appendChild(row);
  });
}

function updateSummary() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const pending = total - completed;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("pendingTasks").textContent = pending;
  document.getElementById("progress").textContent = `${progress}%`;
}

function markDone(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, status: "Completed" } : t);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
  updateSummary();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
  updateSummary();
}

// ===== EDIT FUNCTION ADDED =====
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  // Fill form with existing task data
  document.getElementById("title").value = task.title;
  document.getElementById("subject").value = task.subject;
  document.getElementById("due").value = task.due;
  document.getElementById("priority").value = task.priority;
  document.getElementById("category").value = task.category;
  document.getElementById("description").value = task.description;

  // Switch to "Add Task" section
  document.querySelectorAll("main section").forEach(sec => sec.style.display = "none");
  document.getElementById("addTask").style.display = "block";

  // Remove old active link & set Add Task active
  document.querySelectorAll("nav a").forEach(l => l.classList.remove("active"));
  document.querySelectorAll("nav a")[1].classList.add("active");

  // Update button text temporarily
  const btn = document.querySelector("#taskForm button");
  btn.textContent = "Update Task";

  // Handle update
  const form = document.getElementById("taskForm");
  form.onsubmit = e => {
    e.preventDefault();
    task.title = document.getElementById("title").value.trim();
    task.subject = document.getElementById("subject").value.trim();
    task.due = document.getElementById("due").value;
    task.priority = document.getElementById("priority").value;
    task.category = document.getElementById("category").value;
    task.description = document.getElementById("description").value.trim();

    localStorage.setItem("tasks", JSON.stringify(tasks));
    renderTasks();
    updateSummary();
    form.reset();

    // restore button & form event
    btn.textContent = "Add Task";
    form.onsubmit = null;
    form.addEventListener("submit", e => e.preventDefault());
  };
}
