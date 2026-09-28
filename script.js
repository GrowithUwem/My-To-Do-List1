const STORAGE_KEY = "ai-todo-tasks";

const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const addForm = document.getElementById("add-form");
const taskInput = document.getElementById("task-input");

const aiForm = document.getElementById("ai-form");
const aiInput = document.getElementById("ai-input");
const aiButton = document.getElementById("ai-button");
const aiStatus = document.getElementById("ai-status");
const aiResults = document.getElementById("ai-results");
const aiSuggestions = document.getElementById("ai-suggestions");
const addAllBtn = document.getElementById("add-all-btn");

let tasks = loadTasks();
let currentSuggestions = [];

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function render() {
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }

  tasks.forEach((task) => {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;

    const doneBtn = document.createElement("button");
    doneBtn.textContent = task.done ? "Undo" : "Done";
    doneBtn.addEventListener("click", () => toggleTask(task.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    li.appendChild(span);
    li.appendChild(doneBtn);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

function addTask(text) {
  tasks.push({ id: Date.now() + Math.random(), text, done: false });
  saveTasks();
  render();
}

function toggleTask(id) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = taskInput.value.trim();
  if (!value) return;
  addTask(value);
  taskInput.value = "";
});

aiForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = aiInput.value.trim();
  if (!value) return;

  aiButton.disabled = true;
  aiStatus.textContent = "Asking AI to break this down...";
  aiResults.classList.add("hidden");
  aiSuggestions.innerHTML = "";
  currentSuggestions = [];

  try {
    const res = await fetch("/api/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: value }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    currentSuggestions = Array.isArray(data.subtasks) ? data.subtasks : [];

    if (currentSuggestions.length === 0) {
      aiStatus.textContent = "AI didn't return any subtasks. Try rephrasing the task.";
    } else {
      aiStatus.textContent = "";
      renderSuggestions();
      aiResults.classList.remove("hidden");
    }
  } catch (err) {
    aiStatus.textContent = "Error: " + err.message;
  } finally {
    aiButton.disabled = false;
  }
});

function renderSuggestions() {
  aiSuggestions.innerHTML = "";
  currentSuggestions.forEach((text, index) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = text;

    const btn = document.createElement("button");
    btn.textContent = "Add";
    btn.addEventListener("click", () => {
      addTask(text);
      currentSuggestions.splice(index, 1);
      renderSuggestions();
      if (currentSuggestions.length === 0) {
        aiResults.classList.add("hidden");
      }
    });

    li.appendChild(span);
    li.appendChild(btn);
    aiSuggestions.appendChild(li);
  });
}

addAllBtn.addEventListener("click", () => {
  currentSuggestions.forEach((text) => addTask(text));
  currentSuggestions = [];
  aiResults.classList.add("hidden");
  aiInput.value = "";
});

render();
