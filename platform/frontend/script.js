
const API_URL = "http://localhost:8080/api/recovery-events";
const HEALTH_URL = "http://localhost:8080/api/application-status";
const SIMULATION_URL = "http://localhost:8080/api/simulate-failure";

let dashboardLoading = false;
let simulationRunning = false;

// Safely display a message in the dashboard.
function showAlert(message, type) {
    const alertBox = document.getElementById("connectionAlert");
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = message;
}

// Calculate statistics from recorded FAILURE and RECOVERY events.
function calculateRecoveryStats(events) {
    const sortedEvents = [...events].sort((a, b) => {
        const timeDifference =
            new Date(a.eventTime) - new Date(b.eventTime);

        return timeDifference || Number(a.id) - Number(b.id);
    });

    const pendingFailures = [];
    const recoveryDurations = [];
    let successfulRecoveries = 0;

    for (const event of sortedEvents) {
        if (event.eventType === "FAILURE") {
            pendingFailures.push(event);
        } else if (event.eventType === "RECOVERY") {
            successfulRecoveries++;

            // Match a recovery to the earliest recorded unmatched failure.
            if (pendingFailures.length > 0) {
                const failure = pendingFailures.shift();

                const start = new Date(failure.eventTime).getTime();
                const end = new Date(event.eventTime).getTime();
                const durationSeconds = (end - start) / 1000;

                if (Number.isFinite(durationSeconds) &&
                    durationSeconds >= 0) {
                    recoveryDurations.push(durationSeconds);
                }
            }
        }
    }

    const averageSeconds = recoveryDurations.length
        ? recoveryDurations.reduce((sum, value) => sum + value, 0) /
          recoveryDurations.length
        : null;

    const lastRecoverySeconds = recoveryDurations.length
        ? recoveryDurations[recoveryDurations.length - 1]
        : null;

    // This rate is based on recorded failure/recovery event pairs.
    // It is not a guarantee of recovery for every possible failure.
    const successRate = sortedEvents.filter(
        event => event.eventType === "FAILURE"
    ).length > 0
        ? (
            recoveryDurations.length /
            sortedEvents.filter(
                event => event.eventType === "FAILURE"
            ).length
          ) * 100
        : null;

    return {
        averageSeconds,
        lastRecoverySeconds,
        successRate
    };
}

function formatDuration(seconds) {
    if (seconds === null || !Number.isFinite(seconds)) {
        return "N/A";
    }

    if (seconds < 60) {
        return seconds.toFixed(1) + " sec";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    return minutes + " min " + remainingSeconds + " sec";
}

function displayRecoveryStats(events) {
    const stats = calculateRecoveryStats(events);

    document.getElementById("averageRecoveryTime").textContent =
        formatDuration(stats.averageSeconds);

    document.getElementById("lastRecoveryTime").textContent =
        formatDuration(stats.lastRecoverySeconds);

    document.getElementById("recoverySuccessRate").textContent =
        stats.successRate === null
            ? "N/A"
            : stats.successRate.toFixed(1) + "%";
}

function displayEvents(events) {
    const table = document.getElementById("eventTable");
    table.replaceChildren();

    if (!events.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "text-center py-4";
        cell.textContent = "No recovery events recorded yet.";

        row.appendChild(cell);
        table.appendChild(row);
        return;
    }

    // Newest event first.
    [...events]
        .sort((a, b) => {
            const timeDifference =
                new Date(b.eventTime) - new Date(a.eventTime);

            return timeDifference || Number(b.id) - Number(a.id);
        })
        .forEach(event => {
            const row = document.createElement("tr");

            const values = [
                event.id,
                event.containerName,
                event.eventType,
                event.message,
                event.eventTime
                    ? new Date(event.eventTime).toLocaleString()
                    : "N/A"
            ];

            values.forEach((value, index) => {
                const cell = document.createElement("td");

                if (index === 2) {
                    const badge = document.createElement("span");
                    badge.classList.add("event-badge");

                    if (event.eventType === "FAILURE") {
                        badge.classList.add("event-failure");
                    } else if (event.eventType === "RECOVERY") {
                        badge.classList.add("event-recovery");
                    } else {
                        badge.classList.add("event-other");
                    }

                    badge.textContent = value ?? "Unknown";
                    cell.appendChild(badge);
                } else {
                    cell.textContent = value ?? "";
                }

                row.appendChild(cell);
            });

            table.appendChild(row);
        });
}

async function loadDashboard() {
    if (dashboardLoading) {
        return;
    }

    dashboardLoading = true;

    try {
        const response = await fetch(API_URL, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Recovery history API returned an error.");
        }

        const events = await response.json();

        const failureCount = events.filter(
            event => event.eventType === "FAILURE"
        ).length;

        const recoveryCount = events.filter(
            event => event.eventType === "RECOVERY"
        ).length;

        document.getElementById("failureCount").textContent =
            failureCount;

        document.getElementById("recoveryCount").textContent =
            recoveryCount;

        displayEvents(events);
        displayRecoveryStats(events);

        document.getElementById("lastUpdated").textContent =
            "Updated: " + new Date().toLocaleTimeString();

        showAlert("Connected. Dashboard data updated.", "success");

    } catch (error) {
        showAlert(
            "Cannot load recovery history. Check Spring Boot on port 8080.",
            "danger"
        );

        console.error("Recovery history error:", error);
    } finally {
        dashboardLoading = false;
    }

    // Check application health separately from recovery history.
    try {
        const response = await fetch(HEALTH_URL, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Application status API returned an error.");
        }

        const status = (await response.text()).trim();
        const statusElement = document.getElementById("appStatus");

        statusElement.textContent = status;
        statusElement.classList.remove(
            "status-healthy",
            "status-unhealthy",
            "status-unknown"
        );

        if (status === "Healthy") {
            statusElement.classList.add("status-healthy");
        } else if (status === "Unhealthy" || status === "Unreachable") {
            statusElement.classList.add("status-unhealthy");
        } else {
            statusElement.classList.add("status-unknown");
        }

    } catch (error) {
        const statusElement = document.getElementById("appStatus");

        statusElement.textContent = "Unknown";
        statusElement.classList.remove(
            "status-healthy",
            "status-unhealthy"
        );
        statusElement.classList.add("status-unknown");

        console.error("Application status error:", error);
    }
}

async function simulateFailure() {
    if (simulationRunning) {
        return;
    }

    const confirmed = confirm(
        "This will stop the self-healing-test Docker container temporarily. " +
        "The monitor should restart it automatically. Continue?"
    );

    if (!confirmed) {
        return;
    }

    simulationRunning = true;

    const button = document.getElementById("simulateButton");
    button.disabled = true;
    button.textContent = "Simulating...";

    try {
        showAlert("Simulating failure. Waiting for recovery...", "warning");

        const response = await fetch(SIMULATION_URL, {
            method: "POST"
        });

        const message = await response.text();

        if (!response.ok) {
            throw new Error(message || "Failure simulation failed.");
        }

        showAlert(
            "Failure triggered. Waiting for automatic recovery...",
            "warning"
        );

        // Allow time for the scheduled monitor to detect and recover.
        await new Promise(resolve => setTimeout(resolve, 15000));

        await loadDashboard();

    } catch (error) {
        showAlert(
            "Could not simulate failure: " + error.message,
            "danger"
        );

        console.error("Simulation error:", error);
    } finally {
        simulationRunning = false;
        button.disabled = false;
        button.textContent = "Simulate Failure";
    }
}

// Load on startup and refresh every 10 seconds.
loadDashboard();
setInterval(loadDashboard, 10000);
