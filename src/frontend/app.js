// API endpoint
const apiEndpoint = "https://todo-backend.redcliff-92ba49e6.northeurope.azurecontainerapps.io/api/tasks";

// -----------------
// 1. Déclarer callAzure globalement
// -----------------
async function callAzure() {
    const url = "https://function-fd21-tarres-elise-fbdmgcgfe4cbeqb4.northeurope-01.azurewebsites.net/api/HttpTrigger1?code=lsPxwdkwuqMPE2kBxgsymv5WAaPc-Bb4ntem-IFoRFFPAzFuVbSd5Q==";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }

        const data = await response.text(); // ou .json() si JSON
        document.getElementById("resultat").innerText = data;
    } catch (error) {
        console.error("Erreur lors de l'appel Azure :", error);
        document.getElementById("resultat").innerText = "Erreur : " + error.message;
    }
}

// -----------------
// 2. Todo + UI enhancements (progress + easter egg arcade)
// -----------------
$(document).ready(function () {
    // Charger les tâches au démarrage
    loadTasks();

    // Ajouter une nouvelle tâche
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
            loadTasks();
            $("#todo-input").val("");
        } catch (error) {
            console.error("Erreur lors de l'ajout de la tâche :", error);
        }
    });

    // Marquer tâche complétée / non complétée
    $("#todo-list").on("click", ".task-toggle", async function () {
        const $taskElement = $(this).closest("li");
        const taskId = $taskElement.data("id");
        const isCompleted = $taskElement.hasClass("completed");

        const description = $taskElement.contents().filter(function () {
            return this.nodeType === 3;
        }).text().trim();

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

    // Supprimer tâche
    $("#todo-list").on("click", ".delete-btn", async function (e) {
        e.stopPropagation();
        const taskId = $(this).parent().data("id");
        try {
            await fetch(`${apiEndpoint}?id=${taskId}`, { method: "DELETE" });
            loadTasks();
        } catch (error) {
            console.error("Erreur lors de la suppression :", error);
        }
    });

    // -----------------
    // Progress UI (read-only)
    // -----------------
    function updateProgress(tasks) {
        const total = tasks.length;
        const done = tasks.filter(t => t.completed).length;
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);

        $("#stat-total").text(total);
        $("#stat-done").text(done);
        $("#stat-percent").text(pct);

        $("#progress-fill").css("width", pct + "%");

        if (total === 0) {
            $("#progress-hint").text("Add tasks to begin");
        } else if (pct === 100) {
            $("#progress-hint").text("All missions complete ✨");
        } else if (pct >= 70) {
            $("#progress-hint").text("Almost there — keep going");
        } else if (pct >= 30) {
            $("#progress-hint").text("Good pace — stay focused");
        } else {
            $("#progress-hint").text("Warm up — start completing missions");
        }
    }

    // -----------------
    // Mini-game: Konami → NEON ARCADE overlay
    // Isolated from todo logic
    // -----------------
    const overlay = document.getElementById("arcade-overlay");
    const area = document.getElementById("arcade-area");
    const timeEl = document.getElementById("arcade-time");
    const scoreEl = document.getElementById("arcade-score");
    const bestEl = document.getElementById("arcade-best");
    const btnStart = document.getElementById("arcade-start");
    const btnClose = document.getElementById("arcade-close");
    const btnResetBest = document.getElementById("arcade-reset-best");

    const BEST_KEY = "neon_arcade_best";
    let best = Number(localStorage.getItem(BEST_KEY) || 0);
    bestEl.textContent = best;

    let running = false;
    let score = 0;
    let timeLeft = 20;
    let tickTimer = null;
    let spawnTimer = null;

    function openArcade() {
        overlay.classList.remove("hidden");
        overlay.setAttribute("aria-hidden", "false");
        // reset UI
        stopGame();
        setScore(0);
        setTime(20);
        best = Number(localStorage.getItem(BEST_KEY) || 0);
        bestEl.textContent = best;
        clearArea();
    }

    function closeArcade() {
        stopGame();
        overlay.classList.add("hidden");
        overlay.setAttribute("aria-hidden", "true");
        clearArea();
    }

    function setScore(v) {
        score = v;
        scoreEl.textContent = score;
        if (score > best) {
            best = score;
            localStorage.setItem(BEST_KEY, String(best));
            bestEl.textContent = best;
        }
    }

    function setTime(v) {
        timeLeft = v;
        timeEl.textContent = timeLeft;
    }

    function clearArea() {
        if (!area) return;
        area.innerHTML = "";
    }

    function stopGame() {
        running = false;
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
    }

    function spawnOrb() {
        if (!running) return;
        if (!area) return;

        const orb = document.createElement("div");
        orb.className = "orb";

        const pad = 12;
        const maxX = area.clientWidth - 46 - pad;
        const maxY = area.clientHeight - 46 - pad;
        const x = Math.max(pad, Math.floor(Math.random() * maxX));
        const y = Math.max(pad, Math.floor(Math.random() * maxY));

        orb.style.left = x + "px";
        orb.style.top = y + "px";

        orb.addEventListener("click", () => {
            if (!running) return;
            setScore(score + 1);
            orb.remove();
        });

        area.appendChild(orb);

        // auto remove after a short time to keep it dynamic
        setTimeout(() => {
            if (orb && orb.parentNode) orb.remove();
        }, 850);
    }

    function startGame() {
        if (running) return;
        running = true;
        clearArea();
        setScore(0);
        setTime(20);

        // spawn slightly faster over time
        spawnTimer = setInterval(spawnOrb, 380);

        tickTimer = setInterval(() => {
            if (!running) return;
            timeLeft -= 1;
            setTime(timeLeft);

            if (timeLeft <= 0) {
                stopGame();
                // Little end burst
                for (let i = 0; i < 6; i++) setTimeout(spawnOrb, i * 60);
            }
        }, 1000);
    }

    if (btnStart) btnStart.addEventListener("click", startGame);
    if (btnClose) btnClose.addEventListener("click", closeArcade);
    if (btnResetBest) btnResetBest.addEventListener("click", () => {
        localStorage.removeItem(BEST_KEY);
        best = 0;
        bestEl.textContent = "0";
    });

    // Close overlay with ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
            closeArcade();
        }
    });

    // Konami code: ↑↑↓↓←→←→BA
    const konami = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let kIndex = 0;

    document.addEventListener("keydown", (e) => {
        const key = e.key;

        const expected = konami[kIndex];
        const normalized = (key.length === 1) ? key.toLowerCase() : key;

        if (normalized === expected) {
            kIndex++;
            if (kIndex === konami.length) {
                kIndex = 0;
                openArcade();
            }
        } else {
            // reset but allow quick restart if first matches
            kIndex = (normalized === konami[0]) ? 1 : 0;
        }
    });

    // -----------------
    // Charger les tâches (base functionality intact)
    // -----------------
    async function loadTasks() {
        try {
            const response = await fetch(apiEndpoint);
            const tasks = await response.json();
            tasks.sort((a, b) => a.completed - b.completed);

            $("#todo-list").empty();
            tasks.forEach(task => {
                const listItem = $("<li>")
                    .text(task.description)
                    .data("id", task.id)
                    .addClass(task.completed ? "completed" : "")
                    .append($("<button>").text("Delete").addClass("delete-btn"))
                    .prepend($("<input>").attr("type", "checkbox").addClass("task-toggle").prop("checked", task.completed));

                $("#todo-list").append(listItem);
            });

            // UI only: progress/stats
            updateProgress(tasks);
        } catch (error) {
            console.error("Erreur lors du chargement :", error);
        }
    }
});
