// API endpoint
const apiEndpoint = "https://todo-backend.redcliff-92ba49e6.northeurope.azurecontainerapps.io/api/tasks";

// --- Categories stored locally (does NOT touch backend) ---
const CAT_KEY = "todo_categories_v1"; // localStorage key

function loadCatMap() {
  try { return JSON.parse(localStorage.getItem(CAT_KEY)) || {}; }
  catch { return {}; }
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

// -----------------
// callAzure global
// -----------------
async function callAzure() {
  const url =
    "https://function-fd21-tarres-elise-fbdmgcgfe4cbeqb4.northeurope-01.azurewebsites.net/api/HttpTrigger1?code=lsPxwdkwuqMPE2kBxgsymv5WAaPc-Bb4ntem-IFoRFFPAzFuVbSd5Q==";

  const el = document.getElementById("resultat");

  // UI: loading state
  el.innerText = "Chargement…";

  try {
    const response = await fetch(url, { method: "GET" });
    const text = await response.text();

    if (!response.ok) {
      el.innerText = `Erreur (${response.status})`;
      return;
    }

    // Try to extract a number from whatever the function returns
    const match = text.match(/\d+/);
    if (match) {
      el.innerText = `Nombre de pays : ${match[0]}.`;
    } else {
      // fallback if no number found
      el.innerText = `Nombre de pays : ${text.trim()}.`;
    }
  } catch (error) {
    console.error("Erreur lors de l'appel Azure :", error);
    el.innerText = "Erreur réseau : " + error.message;
  }
}


// -----------------
// Todo + Progress + Categories UI
// -----------------
$(document).ready(function () {
  loadTasks();

  // Add task (backend unchanged)
  $("#todo-form").on("submit", async function (e) {
    e.preventDefault();
    const description = $("#todo-input").val().trim();
    if (!description) return;

    const task = { description };

    try {
      await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });

      // We DON'T know the new id right away without changing backend.
      // So: just reload tasks; user can adjust category per task via dropdown (stored locally).
      loadTasks();

      $("#todo-input").val("");
    } catch (error) {
      console.error("Erreur lors de l'ajout de la tâche :", error);
    }
  });

  // Toggle completed (backend unchanged)
  $("#todo-list").on("click", ".task-toggle", async function () {
    const $taskElement = $(this).closest("li");
    const taskId = $taskElement.data("id");
    const isCompleted = $taskElement.hasClass("completed");

    // robust: read from dedicated span
    const description = $taskElement.find(".task-desc").text().trim();

    if (!description) {
      console.error("Erreur : description vide !");
      return;
    }

    const updatedTask = { id: taskId, description, completed: !isCompleted };
    try {
      await fetch(apiEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });
      loadTasks();
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
    }
  });

  // Delete (backend unchanged)
  $("#todo-list").on("click", ".delete-btn", async function (e) {
    e.stopPropagation();
    const taskId = $(this).parent().data("id");
    try {
      await fetch(`${apiEndpoint}?id=${taskId}`, { method: "DELETE" });

      // also remove category mapping locally
      const map = loadCatMap();
      delete map[String(taskId)];
      saveCatMap(map);

      loadTasks();
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  });

  // Change category (local only)
  $("#todo-list").on("change", ".task-cat-select", function (e) {
    const $li = $(this).closest("li");
    const taskId = $li.data("id");
    const cat = $(this).val();
    setCat(taskId, cat);

    // update badge class immediately without reload
    const $badge = $li.find(".badge");
    $badge.removeClass("badge-work badge-personal badge-study badge-sport")
          .addClass("badge-" + cat);
    $badge.find(".badge-label").text(catLabel(cat));
  });

  // Progress UI (read-only)
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

  // Load tasks
  async function loadTasks() {
    try {
      const response = await fetch(apiEndpoint);
      const tasks = await response.json();
      tasks.sort((a, b) => a.completed - b.completed);

      $("#todo-list").empty();

      tasks.forEach(task => {
        const cat = getCat(task.id);

        // Build UI without changing backend logic
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
            <span class="badge-dot" aria-hidden="true"></span>
            <span class="badge-label">${catLabel(cat)}</span>
          </span>
        `);

        const $catSelect = $(`
          <select class="task-cat-select" aria-label="Task category">
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="study">Study</option>
            <option value="sport">Sport</option>
          </select>
        `).val(cat);

        const $catWrap = $("<div>").addClass("task-cat").append($badge, $catSelect);

        const $delete = $("<button>")
          .text("Delete")
          .addClass("delete-btn");

        $li.append($checkbox, $desc, $catWrap, $delete);
        $("#todo-list").append($li);
      });

      updateProgress(tasks);
    } catch (error) {
      console.error("Erreur lors du chargement :", error);
    }
  }
});
