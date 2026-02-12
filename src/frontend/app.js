// ==============================
// CONFIG
// ==============================
const apiEndpoint =
  "https://todo-backend.redcliff-92ba49e6.northeurope.azurecontainerapps.io/api/tasks";

// ==============================
// CATEGORIES (localStorage only)
// ==============================
const CAT_KEY = "todo_categories_v1";

function loadCatMap() {
  try {
    return JSON.parse(localStorage.getItem(CAT_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCatMap(map) {
  localStorage.setItem(CAT_KEY, JSON.stringify(map));
}

function getCat(taskId) {
  const map = loadCatMap();
  return map[String(taskId)] || "work";
}

function setCat(taskId, cat) {
  const map = loadCatMap();
  map[String(taskId)] = cat;
  saveCatMap(map);
}

function catLabel(cat) {
  if (cat === "work") return "Work";
  if (cat === "personal") return "Personal";
  if (cat === "study") return "Study";
  if (cat === "sport") return "Sport";
  return "Work";
}

// ==============================
// AZURE FUNCTION
// ==============================
async function callAzure() {
  const url =
    "https://function-fd21-tarres-elise-fbdmgcgfe4cbeqb4.northeurope-01.azurewebsites.net/api/HttpTrigger1?code=lsPxwdkwuqMPE2kBxgsymv5WAaPc-Bb4ntem-IFoRFFPAzFuVbSd5Q==";

  const el = document.getElementById("resultat");
  el.innerText = "Chargement…";

  try {
    const response = await fetch(url, { method: "GET" });
    const text = await response.text();

    if (!response.ok) {
      el.innerText = `Erreur (${response.status})`;
      return;
    }

    const match = text.match(/\d+/);

    if (match) {
      el.innerText = `Nombre de pays : ${match[0]}.`;
    } else {
      el.innerText = `Nombre de pays : ${text.trim()}.`;
    }
  } catch (error) {
    el.innerText = "Erreur réseau : " + error.message;
  }
}

// ==============================
// MAIN
// ==============================
$(document).ready(function () {

  loadTasks();

  // ==========================
  // ADD TASK
  // ==========================
  $("#todo-form").on("submit", async function (e) {
    e.preventDefault();

    const description = $("#todo-input").val().trim();
    if (!description) return;

    const task = { description };

    try {
      const selectedCat = $("#category-select").val() || "work";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });

      const createdTask = await response.json();

      if (createdTask && createdTask.id != null) {
        setCat(createdTask.id, selectedCat);
      }

      $("#todo-input").val("");
      loadTasks();

    } catch (error) {
      console.error("Erreur lors de l'ajout :", error);
    }
  });

  // ==========================
  // TOGGLE TASK
  // ==========================
  $("#todo-list").on("click", ".task-toggle", async function () {

    const $taskElement = $(this).closest("li");
    const taskId = $taskElement.data("id");
    const isCompleted = $taskElement.hasClass("completed");
    const description = $taskElement.find(".task-desc").text().trim();

    const updatedTask = {
      id: taskId,
      description,
      completed: !isCompleted,
    };

    try {
      await fetch(apiEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });

      loadTasks();
    } catch (error) {
      console.error("Erreur update :", error);
    }
  });

  // ==========================
  // DELETE TASK
  // ==========================
  $("#todo-list").on("click", ".delete-btn", async function (e) {
    e.stopPropagation();

    const taskId = $(this).parent().data("id");

    try {
      await fetch(`${apiEndpoint}?id=${taskId}`, { method: "DELETE" });

      const map = loadCatMap();
      delete map[String(taskId)];
      saveCatMap(map);

      loadTasks();
    } catch (error) {
      console.error("Erreur suppression :", error);
    }
  });

  // ==========================
  // CHANGE CATEGORY
  // ==========================
  $("#todo-list").on("change", ".task-cat-select", function () {

    const $li = $(this).closest("li");
    const taskId = $li.data("id");
    const cat = $(this).val();

    setCat(taskId, cat);

    const $badge = $li.find(".badge");
    $badge
      .removeClass("badge-work badge-personal badge-study badge-sport")
      .addClass("badge-" + cat);

    $badge.find(".badge-label").text(catLabel(cat));
  });

});

// ==============================
// LOAD TASKS
// ==============================
async function loadTasks() {
  try {
    const response = await fetch(apiEndpoint);
    const tasks = await response.json();
    tasks.sort((a, b) => a.completed - b.completed);

    $("#todo-list").empty();

    tasks.forEach(task => {

      const cat = getCat(task.id);

      const $li = $("<li>")
        .data("id", task.id)
        .addClass(task.completed ? "completed" : "");

      const $checkbox = $("<input>")
        .attr("type", "checkbox")
        .addClass("task-toggle")
        .prop("checked", task.completed);

      const $desc = $("<span>")
        .addClass("task-desc")
        .text(task.description);

      const $badge = $(`
        <span class="badge badge-${cat}">
          <span class="badge-dot"></span>
          <span class="badge-label">${catLabel(cat)}</span>
        </span>
      `);

      const $catSelect = $(`
        <select class="task-cat-select">
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="study">Study</option>
          <option value="sport">Sport</option>
        </select>
      `).val(cat);

      const $catWrap = $("<div>")
        .addClass("task-cat")
        .append($badge, $catSelect);

      const $delete = $("<button>")
        .text("Delete")
        .addClass("delete-btn");

      $li.append($checkbox, $desc, $catWrap, $delete);
      $("#todo-list").append($li);
    });

    updateProgress(tasks);

  } catch (error) {
    console.error("Erreur chargement :", error);
  }
}

// ==============================
// PROGRESS BAR
// ==============================
function updateProgress(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  $("#stat-total").text(total);
  $("#stat-done").text(done);
  $("#stat-percent").text(pct);
  $("#progress-fill").css("width", pct + "%");

  if (total === 0) $("#progress-hint").text("Add tasks to begin");
  else if (pct === 100) $("#progress-hint").text("All tasks complete ✨");
  else if (pct >= 70) $("#progress-hint").text("Almost there — keep going");
  else if (pct >= 30) $("#progress-hint").text("Good pace — stay focused");
  else $("#progress-hint").text("Warm up — start completing tasks");
}
