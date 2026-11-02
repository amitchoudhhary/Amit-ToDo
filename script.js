const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const priorityInput = document.getElementById("priority-input");
const dueInput = document.getElementById("due-input");
const searchInput = document.getElementById("search");
const list = document.getElementById("todo-list");
const countEl = document.getElementById("count");
const clearBtn = document.getElementById("clear-completed");
const toggleAllBtn = document.getElementById("toggle-all");
const themeToggle = document.getElementById("theme-toggle");
const filterBtns = document.querySelectorAll(".filter");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

function load(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
function store(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }

let todos;
try { todos = JSON.parse(load("todos")) || []; } catch (_) { todos = []; }
let currentFilter = "all";
let query = "";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function save() { store("todos", JSON.stringify(todos)); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDue(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function render() {
  list.innerHTML = "";

  const visible = todos
    .filter(t => {
      if (currentFilter === "active" && t.done) return false;
      if (currentFilter === "completed" && !t.done) return false;
      return t.text.toLowerCase().includes(query);
    })
    .sort((a, b) =>
      a.done - b.done ||
      (PRIORITY_ORDER[a.priority || "medium"] - PRIORITY_ORDER[b.priority || "medium"]) ||
      (a.due || "9999").localeCompare(b.due || "9999"));

  if (visible.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = query ? "No tasks match your search." : "Nothing here yet.";
    list.appendChild(empty);
  }

  const today = todayStr();

  visible.forEach(todo => {
    const li = document.createElement("li");
    if (todo.done) li.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.setAttribute("aria-label", "Mark task done");
    checkbox.addEventListener("change", () => {
      todo.done = checkbox.checked;
      save();
      render();
    });

    const main = document.createElement("div");
    main.className = "task-main";

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = todo.text;
    text.title = "Double-click to edit";
    text.addEventListener("dblclick", () => startEdit(todo, main, text));

    const meta = document.createElement("div");
    meta.className = "task-meta";
    const pr = todo.priority || "medium";
    const badge = document.createElement("span");
    badge.className = `badge ${pr}`;
    badge.textContent = pr[0].toUpperCase() + pr.slice(1);
    meta.appendChild(badge);
    if (todo.due) {
      const due = document.createElement("span");
      const overdue = !todo.done && todo.due < today;
      due.className = "due" + (overdue ? " overdue" : "");
      due.textContent = (overdue ? "Overdue · " : "Due ") + formatDue(todo.due);
      meta.appendChild(due);
    }

    main.append(text, meta);

    const del = document.createElement("button");
    del.className = "delete";
    del.innerHTML = "&times;";
    del.setAttribute("aria-label", "Delete task");
    del.addEventListener("click", () => {
      todos = todos.filter(t => t.id !== todo.id);
      save();
      render();
    });

    li.append(checkbox, main, del);
    list.appendChild(li);
  });

  const left = todos.filter(t => !t.done).length;
  const done = todos.length - left;
  countEl.textContent = `${left} task${left === 1 ? "" : "s"} left`;
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;
  progressBar.style.width = pct + "%";
  progressText.textContent = todos.length ? `${done} of ${todos.length} done (${pct}%)` : "Add your first task to get started.";
  toggleAllBtn.textContent = left === 0 && todos.length ? "Mark all active" : "Mark all done";
}

function startEdit(todo, main, textEl) {
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "edit-input";
  editInput.value = todo.text;
  main.replaceChild(editInput, textEl);
  editInput.focus();

  let cancelled = false;
  const finish = () => {
    if (!cancelled) {
      const value = editInput.value.trim();
      if (value) todo.text = value;
      save();
    }
    render();
  };

  editInput.addEventListener("blur", finish);
  editInput.addEventListener("keydown", e => {
    if (e.key === "Enter") editInput.blur();
    if (e.key === "Escape") { cancelled = true; editInput.blur(); }
  });
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  todos.push({
    id: Date.now(),
    text: value,
    done: false,
    priority: priorityInput.value,
    due: dueInput.value || ""
  });
  input.value = "";
  dueInput.value = "";
  priorityInput.value = "medium";
  save();
  render();
});

searchInput.addEventListener("input", () => {
  query = searchInput.value.trim().toLowerCase();
  render();
});

clearBtn.addEventListener("click", () => {
  todos = todos.filter(t => !t.done);
  save();
  render();
});

toggleAllBtn.addEventListener("click", () => {
  const allDone = todos.length > 0 && todos.every(t => t.done);
  todos.forEach(t => { t.done = !allDone; });
  save();
  render();
});

filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    render();
  });
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  store("amit-todo-theme", theme);
}
themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
});

(function init() {
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(load("amit-todo-theme") || (prefersLight ? "light" : "dark"));
  document.getElementById("today").textContent =
    new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  render();
})();
