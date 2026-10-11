// Validate water point status
const validateReportStatus = (maintenanceReportStatus) => {
    const status = maintenanceReportStatus.status.trim().toLowerCase();

    if (status !== "operational" && status !== "needs fixing" && status !== "broken") {
        return "Please enter a valid status.";
    }
    return "";
};

// Validate maintenance report date
const validateReportDate = (maintenanceReportDate) => {
    const reportDate = new Date(maintenanceReportDate.date);
    const today = new Date();

    if (!maintenanceReportDate.date || Number.isNaN(reportDate.getTime()) || reportDate > today) {
        return "Please enter a valid date that is not null or not in the future.";
    }
    return "";
};

// Validate water point ID
const validateReportWaterPointId = (maintenanceReportWaterPointId) => {
    const amount = Number(maintenanceReportWaterPointId.amount);

    if (!Number.isInteger(amount) || amount <= 0) {
        return "Amount must be a whole number greater than 0.";
    }
    return "";
};


// Insert maintenance report
document.querySelector("#maintenanceReportForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    clearShownMessages();

    const reportWaterPointId = {
        amount: document.querySelector("#reportWaterPointId").value
    };

    const errorAddId = validateReportWaterPointId(reportWaterPointId);
    if (errorAddId) {
        showMessage("reportWaterPointIdMessage", errorAddId, "error");
        return;
    }

    const reportDate = {
        date: document.querySelector("#date").value
    };

    const errorAddDate = validateReportDate(reportDate);
    if (errorAddDate) {
        showMessage("reportDateMessage", errorAddDate, "error");
        return;
    }

    const reportStatus = {
        status: document.querySelector("#pumpStatus").value
    };

    const errorAddPumpStatus = validateReportStatus(reportStatus);
    if (errorAddPumpStatus) {
        showMessage("pumpStatusMessage", errorAddPumpStatus, "error");
        return;
    }

    const sqlForTable = `
    INSERT INTO tblMaintenanceReport (waterPointId, reportDate, pumpStatus)
    VALUES ('${reportWaterPointId.amount}', '${reportDate.date}', '${reportStatus.status}');
    `;

    const result = await runQuery(sqlForTable);

    if (result && result.success) {
        showMessage("addReportMessage", "Maintenance report added successfully!", "success");
        document.querySelector("#maintenanceReportForm").reset();
        printReportTable();
    } else {
        showMessage("addReportMessage", result?.error || "Insert failed.", "error");
    }
});

// runs printReportTable after html has loaded
document.addEventListener("DOMContentLoaded", () => {

    function openEditPopup(editReportId, editWaterPointId, editReportDate, editPumpStatus) {

        document.querySelector("#editReportId").value = editReportId;
        document.querySelector("#editWaterPointId").value = editWaterPointId;
        document.querySelector("#editReportDate").value = editReportDate;
        document.querySelector("#editPumpStatus").value = editPumpStatus;

        document.querySelector("#editReportPopup").style.display = "block";
    }

    async function deleteReport(editReportId) {
        if (!confirm("Are you sure you want to delete this maintenance report?")) return;

        const sqlDelete = `DELETE FROM tblMaintenanceReport WHERE reportId = ${editReportId}`;
        await runQuery(sqlDelete);

        printReportTable();
    }


    // Build the table
    const printReportTable = async () => {
        const output = document.querySelector("#reportTableOutput");
        output.textContent = "";

        const sql = "SELECT reportId, waterPointId, reportDate, pumpStatus FROM tblMaintenanceReport ORDER BY reportId DESC";
        const result = await runQuery(sql);

        if (!result || !result.data || result.data.length === 0) {
            output.textContent = "No Rows Returned";
            return;
        }

        const rows = result.data;
        const table = document.createElement("table");

        const headerRow = document.createElement("tr");
        table.appendChild(headerRow);

        const headings = ["Report ID", "Water Point ID", "Report Date", "Pump Status", "Edit/Delete"];
        for (let heading of headings) {
            const th = document.createElement("th");
            th.textContent = heading;
            headerRow.appendChild(th);
        }

        for (let row of rows) {
            const tr = document.createElement("tr");

            const tdId = document.createElement("td");
            tdId.textContent = row.reportId;
            tr.appendChild(tdId);

            const tdWaterPointId = document.createElement("td");
            tdWaterPointId.textContent = row.waterPointId;
            tr.appendChild(tdWaterPointId);

            const tdReportDate = document.createElement("td");
            tdReportDate.textContent = row.reportDate;
            tr.appendChild(tdReportDate);

            const tdPumpStatus = document.createElement("td");
            tdPumpStatus.textContent = row.pumpStatus;
            tr.appendChild(tdPumpStatus);

            const tdActions = document.createElement("td");

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.classList.add("edit-btn");
            editBtn.onclick = () => openEditPopup(row.reportId, row.waterPointId, row.reportDate, row.pumpStatus);
            tdActions.appendChild(editBtn);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.classList.add("delete-btn");
            deleteBtn.onclick = () => deleteReport(row.reportId);
            tdActions.appendChild(deleteBtn);

            tr.appendChild(tdActions);

            table.appendChild(tr);
        }

        output.appendChild(table);
    };

    printReportTable();

    // cancel edit
    document.querySelector("#cancelEdit").onclick = () => {
        document.querySelector("#editReportPopup").style.display = "none";
    };

    // submit edit
    document.querySelector("#editReportForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        clearShownMessages();

        const reportId = document.querySelector("#editReportId").value;
        const editWaterPointId = document.querySelector("#editWaterPointId").value;
        const editReportDate = document.querySelector("#editReportDate").value;
        const editPumpStatus = document.querySelector("#editPumpStatus").value;

        const editWPId = { amount: editWaterPointId };
        const editDate = { date: editReportDate };
        const editStatus = { status: editPumpStatus };

        const reportWaterPointId = {
        amount: document.querySelector("#reportWaterPointId").value
    };

    const errorEditWaterPointId = validateReportWaterPointId(editWPId);
    if (errorEditWaterPointId) {
        showMessage("editWaterPointIdMessage", errorEditWaterPointId, "error");
        return;
    }

    const reportDate = {
        date: document.querySelector("#date").value
    };

    const errorEditReportDate = validateReportDate(editDate);
    if (errorEditReportDate) {
        showMessage("editReportDateMessage", errorEditReportDate, "error");
        return;
    }

    const reportStatus = {
        status: document.querySelector("#pumpStatus").value
    };

    const errorEditPumpStatus = validateReportStatus(editStatus);
    if (errorEditPumpStatus) {
        showMessage("editPumpStatusMessage", errorEditPumpStatus, "error");
        return;
    }

        const sql = `UPDATE tblMaintenanceReport 
                    SET waterPointId = '${editWaterPointId}', reportDate = '${editReportDate}', pumpStatus = '${editPumpStatus}' 
                    WHERE reportId = ${reportId}`;

        await runQuery(sql);

        document.querySelector("#editReportPopup").style.display = "none";
        printReportTable();
    });

});

// Show success/error messages
const showMessage = (messageId, text, type) => {
    const output = document.querySelector(`#${messageId}`);

    // Added code to clear previous messages
    if (!text) {
        output.textContent = "";
        output.className = "message";
        return;
    }

    output.textContent = text;
    output.className = `message ${type}`;
};

// Helper to clear messages
const clearShownMessages = () => {
    showMessage("addReportMessage", "", "");
    showMessage("reportDateMessage", "", "");
    showMessage("pumpStatusMessage", "", "");
    showMessage("reportWaterPointIdMessage", "", "");
    showMessage("editWaterPointIdMessage", "", "");
    showMessage("editReportDateMessage", "", "");
    showMessage("editPumpStatusMessage", "", "");
    showMessage("graphYearsMessage", "", "");
    showMessage("reportCommunityIdMessage", "", "");
    showMessage("reportChartMessage", "", "");
}

let reportChartInstance = null;
let selectedReport = "";

const graphForm = document.querySelector("#enterGraphYears");
const graphCommunity = document.querySelector("#enterGraphCommunity")
const graphContainer = document.querySelector("#displayReportGraph");
const report1ChartCanvas = document.querySelector("#report1BarChart");
const report2ChartCanvas = document.querySelector("#report2BarChart");
const report3ChartCanvas = document.querySelector("#report3BarChart");

document.querySelectorAll(".reportBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
        selectedReport = btn.dataset.report;

        graphForm.classList.add("hidden");
        graphCommunity.classList.add("hidden");
        graphContainer.classList.add("hidden");

        report1ChartCanvas.classList.add("hidden");
        report2ChartCanvas.classList.add("hidden");
        report3ChartCanvas.classList.add("hidden");

        if (reportChartInstance) {
            reportChartInstance.destroy();
            reportChartInstance = null;
        }

        if (selectedReport === "maintenanceGraph1") {
            graphForm.classList.remove("hidden");
            report1ChartCanvas.classList.remove("hidden");
        } else if (selectedReport === "maintenanceGraph2") {
            report2ChartCanvas.classList.remove("hidden");
            graphCommunity.classList.remove("hidden")
        } else if (selectedReport === "maintenanceGraph3") {
            graphContainer.classList.remove("hidden");
            report3ChartCanvas.classList.remove("hidden");
            await drawMaintenanceGraph3();
        }
    });
});

graphForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearShownMessages();

    const startYear = Number(document.querySelector("#startYear").value);
    const endYear = Number(document.querySelector("#endYear").value);

    // Validate start and end years
    const validateGraphYears = (startYear, endYear) => {
        const thisYear = new Date().getFullYear();

        if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
            return "Please enter whole years.";
        }

        if (startYear < 0 || endYear < 0) {
            return "Years cannot be negative.";
        }

        if (startYear > thisYear || endYear > thisYear) {
            return "Years cannot be in the future.";
        }

        if (startYear > endYear) {
            return "Start year cannot be after end year.";
        }
        return "";
    };

    const yearError = validateGraphYears(startYear, endYear);
    if (yearError) {
        showMessage("graphYearsMessage", yearError, "error");
        return;
    }

    // Get data from the database for the graph
    // Code was changed from the SQL report to better suit the graph and improve readablity on the site
    const sqlForGraph1 = `SELECT
    YEAR(reportDate) AS reportYear,
    SUM(CASE WHEN pumpStatus = 'Operational' THEN 1 ELSE 0 END) AS operationalCount,
    SUM(CASE WHEN pumpStatus = 'Needs Fixing' THEN 1 ELSE 0 END) AS needsFixingCount,
    SUM(CASE WHEN pumpStatus = 'Broken' THEN 1 ELSE 0 END) AS brokenCount
FROM tblMaintenanceReport
WHERE YEAR(reportDate) BETWEEN ${startYear} AND ${endYear}
GROUP BY YEAR(reportDate)
ORDER BY YEAR(reportDate);`;

    // Run the query and check for results
    const result1 = await runQuery(sqlForGraph1);

    if (!result1 || !result1.data) {
        showMessage("graphYearsMessage", "Could not load chart data.", "error");
        return;
    }
    console.log(result1);

    const countsByYear = {};

    // Initialize counts for all years in the range to 0
    for (let year = startYear; year <= endYear; year++) {
        countsByYear[year] = {
            operational: 0,
            needsFixing: 0,
            broken: 0
        };
    }

    // Update counts with actual data from the database
    for (const row of result1.data) {
        countsByYear[row.reportYear] = {
            operational: Number(row.operationalCount),
            needsFixing: Number(row.needsFixingCount),
            broken: Number(row.brokenCount)
        };
    }

    // Set up empty arrays to input data into
    const labels = [];
    const operationalCounts = [];
    const needsFixingCounts = [];
    const brokenCounts = [];

    // Populate arrays with data for each year in the range, using 0 for years with no reports
    for (let year = startYear; year <= endYear; year++) {
        labels.push(String(year));
        operationalCounts.push(countsByYear[year].operational);
        needsFixingCounts.push(countsByYear[year].needsFixing);
        brokenCounts.push(countsByYear[year].broken);
    }

    if (reportChartInstance) {
        reportChartInstance.destroy();
        reportChartInstance = null;
    }

    // create Chart.js to make the bar chart for maintenance report
    reportChartInstance = new Chart(report1ChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: "Operational",
                data: operationalCounts,
                backgroundColor: [
                    "rgba(34, 197, 94, 0.7)",
                ],
                borderColor: [
                    "rgba(34, 197, 94, 1)",
                ],
                borderWidth: 1
            },
            {
                label: "Needs Fixing",
                data: needsFixingCounts,
                backgroundColor: [
                    "rgba(245, 158, 11, 0.7)",
                ],
                borderColor: [
                    "rgba(245, 158, 11, 1)",
                ],
                borderWidth: 1
            },
            {
                label: "Broken",
                data: brokenCounts,
                backgroundColor: [
                    "rgba(239, 68, 68, 0.7)",
                ],
                borderColor: [
                    "rgba(239, 68, 68, 1)",
                ],
                borderWidth: 1
            }]
        },
        // options 
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Number of Reports"
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Year"
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: {
                        usePointStyle: true
                    }
                }
            }
        }
    });
    graphContainer.classList.remove("hidden");
});

graphCommunity.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearShownMessages();

    const communityId = Number(document.querySelector("#maintenanceCommunityId").value);

    const validateCommunityId = (communityId) => {
        if (!Number.isInteger(communityId) || communityId <= 0) {
            return "Please enter a valid community Id";
        }
    }

    const communityIdError = validateCommunityId(communityId);
    if (communityIdError) {
        showMessage("reportCommunityIdMessage", communityIdError, "error");
        return;
    }

    const sqlForGraph2 = `SELECT c.country, COUNT(*) AS activePumps
FROM tblCommunity c
JOIN tblWaterPoints w
  ON c.communityId = w.communityId
JOIN tblMaintenanceReport m
  ON m.reportId = (
      SELECT m2.reportId
      FROM tblMaintenanceReport m2
      WHERE m2.waterPointId = w.waterPointId
      ORDER BY m2.reportDate DESC, m2.reportId DESC
      LIMIT 1
  )
WHERE c.communityId = ${communityId}
  AND m.pumpStatus = 'Operational'
GROUP BY c.country;`

    const result2 = await runQuery(sqlForGraph2);

    if (!result2 || !result2.data) {
        showMessage("reportCommunityIdMessage", "Could not load chart data.", "error");
        return;
    }
    console.log(result2);

    const operationalPumps = result2.data.length > 0 ? Number(result2.data[0].activePumps) : 0;

    if (reportChartInstance) {
        reportChartInstance.destroy();
        reportChartInstance = null;
    }

    reportChartInstance = new Chart(report2ChartCanvas, {
        type: 'bar',
        data: {
            labels: ["Community " + communityId],
            datasets: [{
                label: "Operational Pumps",
                data: [operationalPumps],
                backgroundColor: [
                    "rgba(54, 243, 44, 0.7)",
                ],
                borderColor: [
                    "rgba(54, 243, 44, 1)",
                ],
                borderWidth: 1
            }]
        },
        // options 
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Number of Pumps"
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Community"
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: {
                        usePointStyle: true
                    }
                }
            }
        }
    });
    graphContainer.classList.remove("hidden");
})

// Use SQL code from previously created reports
// While debugging, modify the code so it works with dbConnector and display the correct chart
const drawMaintenanceGraph3 = async () => {
    const sqlForGraph3 = `SELECT 
    c.country,
    COUNT(DISTINCT w.waterPointId) AS instanceOfPumpFailure
FROM tblMaintenanceReport m
JOIN tblWaterPoints w on m.waterPointId = w.waterPointId
JOIN tblCommunity c on w.communityId = c.communityId
WHERE m.pumpStatus IN ('Broken', 'Needs Fixing')
GROUP BY c.country
HAVING COUNT(DISTINCT w.waterPointId) > 0
ORDER BY instanceOfPumpFailure DESC;`;

    // Run the query and check for results
    const result3 = await runQuery(sqlForGraph3);

    if (!result3 || !result3.data) {
        showMessage("reportChartMessage", "Could not load chart data.", "error");
        return;
    }
    console.log(result3);

    // Set up empty arrays to input data into
    const countries = [];
    const failedPumps = [];

    // Adds data to values
    for (const row of result3.data) {
        countries.push(row.country);
        failedPumps.push(Number(row.instanceOfPumpFailure));
    };

    console.log(result3.data);
    console.log(countries, failedPumps);

    // create Chart.js to make the bar chart for maintenance report
    reportChartInstance = new Chart(report3ChartCanvas, {
        type: 'bar',
        data: {
            labels: countries,
            datasets: [{
                label: "Failed Pumps",
                data: failedPumps,
                backgroundColor: [
                    "rgba(239, 68, 68, 0.7)",
                ],
                borderColor: [
                    "rgba(239, 68, 68, 1)",
                ],
                borderWidth: 1
            }]
        },
        // options 
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Number of Pumps"
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Country"
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: {
                        usePointStyle: true
                    }
                }
            }
        }
    });
    graphContainer.classList.remove("hidden");
}