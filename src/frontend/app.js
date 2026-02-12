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
        el.innerText = match
            ? `Nombre de pays : ${match[0]}.`
            : `Nombre de pays : ${text.trim()}.`;
    } catch (error) {
        el.innerText = "Erreur réseau : " + error.message;
    }
}

// ==============================
// HELPERS
// ==============================

// Trouve l'ID de la tâche "la plus probable" nouvellement créée
// (même si le backend ne renvoie pas l'objet créé)
function findNewestTaskIdByDescription(tasks, description) {
    const desc = description.trim().toLowerCase();

    const matches = tasks.filter(
        (t) => (t.description || "").trim().toLowerCase() === desc
    );

    if (matches.length === 0) return null;

    // Si les IDs sont numériques, on prend le plus grand (souvent le plus récent)
    const allNumeric = matches.every((m) => /^\d+$/.test(String(m.id)));

    if (allNumeric) {
        matches.sort((a, b) => Number(b.id) - Number(a.id));
        return matches[0].id;
    }

    // Sinon, on prend le dernier match (souvent ajouté en dernier)
    return matches[matches.length - 1].id;
}

// ==============================
// MAIN (bind events when DOM is ready)
// ==============================
$(document).ready(function () {
    loadTasks();

    // ==========================
    // THEME TOGGLE
    // ==========================
    const toggleBtn = $("#theme-toggle");

    // Charger thème sauvegardé
    if (localStorage.getItem("theme") === "light") {
        $("body").addClass("light-mode");
        toggleBtn.text("☀️ Light");
    }

    // Toggle
    toggleBtn.on("click", function () {
        $("body").toggleClass("light-mode");

        if ($("body").hasClass("light-mode")) {
            localStorage.setItem("theme", "light");
            toggleBtn.text("☀️ Light");
        } else {
            localStorage.setItem("theme", "dark");
            toggleBtn.text("🌙 Dark");
        }
    });

    // ADD TASK (backend unchanged)
    $("#todo-form").on("submit", async function (e) {
        e.preventDefault();

        const description = $("#todo-input").val().trim();
        if (!description) return;

        const selectedCat = $("#category-select").val() || "work";
        const task = { description };

        try {
            // 1) create task
            await fetch(apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(task),
            });

            // 2) reload tasks from API
            const response = await fetch(apiEndpoint);
            const tasks = await response.json();

            // 3) find the newly created task id and assign category locally
            const newId = findNewestTaskIdByDescription(tasks, description);
            if (newId != null) {
                setCat(newId, selectedCat);
            } else {
                console.warn("Impossible de retrouver la tâche créée pour appliquer la catégorie.");
            }

            // UI reset
            $("#todo-input").val("");

            // 4) refresh UI (using normal loader)
            loadTasks();
        } catch (error) {
            console.error("Erreur lors de l'ajout :", error);
        }
    });

    // TOGGLE (backend unchanged)
    $("#todo-list").on("click", ".task-toggle", async function () {
        const $taskElement = $(this).closest("li");
        const taskId = $taskElement.data("id");
        const isCompleted = $taskElement.hasClass("completed");
        const description = $taskElement.find(".task-desc").text().trim();

        const updatedTask = { id: taskId, description, completed: !isCompleted };

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

    // DELETE (backend unchanged)
    $("#todo-list").on("click", ".delete-btn", async function (e) {
        e.stopPropagation();
        const taskId = $(this).parent().data("id");

        try {
            await fetch(`${apiEndpoint}?id=${taskId}`, { method: "DELETE" });

            // remove local category mapping too
            const map = loadCatMap();
            delete map[String(taskId)];
            saveCatMap(map);

            loadTasks();
        } catch (error) {
            console.error("Erreur suppression :", error);
        }
    });

    // CHANGE CATEGORY (local only)
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
// LOAD TASKS (renders UI)
// ==============================
async function loadTasks() {
    try {
        const response = await fetch(apiEndpoint);
        const tasks = await response.json();
        tasks.sort((a, b) => a.completed - b.completed);

        $("#todo-list").empty();

        tasks.forEach((task) => {
            const cat = getCat(task.id);

            const $li = $("<li>")
                .data("id", task.id)
                .addClass(task.completed ? "completed" : "");

            const $checkbox = $("<input>")
                .attr("type", "checkbox")
                .addClass("task-toggle")
                .prop("checked", task.completed);

            const $desc = $("<span>").addClass("task-desc").text(task.description);

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

            const $catWrap = $("<div>").addClass("task-cat").append($badge, $catSelect);

            const $delete = $("<button>").text("Delete").addClass("delete-btn");

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
    const done = tasks.filter((t) => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    setProgressGlow(pct);

    // 2) Confetti when reaching 100% (once per "completion")
    const wasDone = localStorage.getItem("was100") === "1";
    if (pct === 100 && !wasDone) {
        launchConfetti(1800);
        localStorage.setItem("was100", "1");
    }
    if (pct < 100 && wasDone) {
        localStorage.setItem("was100", "0");
    }

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

// ==============================
// PROGRESS GLOW (0..1)
// ==============================
function setProgressGlow(pct) {
    // pct is 0..100 -> convert to 0..1
    const t = Math.max(0, Math.min(1, pct / 100));

    // Make it feel impactful near the end (ease-out)
    const eased = 1 - Math.pow(1 - t, 2);

    // Cap glow so it's not blinding
    const glow = 0.05 + eased * 0.55; // from 0.05 to 0.60
    document.body.style.setProperty("--glow", glow.toFixed(3));
}

// ==============================
// CONFETTI (simple canvas burst)
// ==============================
let confettiRunning = false;
let confettiRAF = null;

function launchConfetti(durationMs = 1600) {
    if (confettiRunning) return;
    confettiRunning = true;

    const canvas = document.getElementById("confetti");
    const ctx = canvas.getContext("2d");

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();

    const pieces = [];
    const count = 180;

    for (let i = 0; i < count; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * canvas.height * 0.3,
            vx: (Math.random() - 0.5) * 6,
            vy: 2 + Math.random() * 6,
            size: 4 + Math.random() * 6,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.2,
            // use your neon palette
            color: ["#5b7cff", "#a855f7", "#22d3ee", "#34d399", "#ffffff"][Math.floor(Math.random() * 5)],
            life: 0
        });
    }

    const start = performance.now();

    function frame(now) {
        const elapsed = now - start;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of pieces) {
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            p.life += 1;

            // little gravity
            p.vy += 0.03;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, 1 - elapsed / durationMs);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        }

        if (elapsed < durationMs) {
            confettiRAF = requestAnimationFrame(frame);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            confettiRunning = false;
            confettiRAF = null;
        }
    }

    window.addEventListener("resize", resize, { once: true });
    confettiRAF = requestAnimationFrame(frame);
}

