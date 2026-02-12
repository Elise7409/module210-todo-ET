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
// 2. Todo (fonctionnalités de base intactes) + Progress UI (lecture seule)
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

    // ---- Progress UI (lecture seule) ----
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
            $("#progress-hint").text("All tasks complete ✨");
        } else if (pct >= 70) {
            $("#progress-hint").text("Almost there — keep going");
        } else if (pct >= 30) {
            $("#progress-hint").text("Good pace — stay focused");
        } else {
            $("#progress-hint").text("Warm up — start completing tasks");
        }
    }

    // Charger les tâches
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

            // UI only: progression + stats
            updateProgress(tasks);
        } catch (error) {
            console.error("Erreur lors du chargement :", error);
        }
    }
});
