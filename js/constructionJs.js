/// grabs the active projects and puts them in the table
const printActiveProjects = async () => {
    
    const banner = document.querySelector("#activeBanner");
    const tbody = document.querySelector("#activeProjectsTableBody");
    tbody.innerHTML = "";

    // gets active projects and works out the funding % from the view, caps it at 100
    const sql = `SELECT con.constructionId, UPPER(c.country) AS countryName, wp.pointType,
        CASE
            WHEN vw.budget IS NULL OR vw.budget = 0 THEN 0
            WHEN ROUND((vw.totalDonated / vw.budget) * 100, 2) > 100 THEN 100
            ELSE ROUND((vw.totalDonated / vw.budget) * 100, 2)
        END AS fundingPercentage
    FROM tblConstruction con
    LEFT JOIN tblWaterPoints wp ON con.constructionId = wp.constructionId
    LEFT JOIN tblCommunity c ON wp.communityId = c.communityId
    LEFT JOIN vwConstructionFunding vw ON con.constructionId = vw.constructionId
    ORDER BY con.constructionId DESC;`;

    const result = await runQuery(sql);

    // if nothing comes back just show a message
    if (!result || !result.data || result.data.length === 0) {
        banner.textContent = "No active projects found.";
        return;
    }

    banner.textContent = result.data.length + " active project(s) found.";

    // go through each row and add it to the table
    for (let row of result.data) {
        const tr = document.createElement("tr");

        const tdActive = document.createElement("td");
        tdActive.textContent = "Yes";
        tr.appendChild(tdActive);

        const tdName = document.createElement("td");
        tdName.textContent = "Project " + row.constructionId + " - " + row.countryName + " (" + row.pointType + ")";
        tr.appendChild(tdName);

        const tdFunding = document.createElement("td");
        tdFunding.textContent = row.fundingPercentage + "%";
        tr.appendChild(tdFunding);

        tbody.appendChild(tr);
    }
};

// same idea but for completed projects, shows how many days each one took
const printCompletedProjects = async () => {
    const banner = document.querySelector("#completedBanner");
    const tbody = document.querySelector("#completedProjectsTableBody");
    tbody.innerHTML = "";

    // filters to only projects where the end date has passed, uses DATEDIFF to get duration
    const sql = 
    `SELECT con.constructionId, UPPER(c.country) AS countryName,
            DATEDIFF(con.endDate, con.startDate) AS durationDays
        FROM tblConstruction con
        JOIN tblWaterPoints wp ON con.constructionId = wp.constructionId
        JOIN tblCommunity c ON wp.communityId = c.communityId
        WHERE con.endDate < CURDATE()
        GROUP BY con.constructionId, c.country, con.startDate, con.endDate
        ORDER BY durationDays DESC;`;

    const result = await runQuery(sql);
    console.log(result);

    if (!result || !result.data || result.data.length === 0) {
        banner.textContent = "No completed projects found.";
        return;
    }

    banner.textContent = result.data.length + " completed project(s) found.";

    // loop through and build the table rows
    for (let row of result.data) {
        const tr = document.createElement("tr");

        const tdCompleted = document.createElement("td");
        tdCompleted.textContent = "Yes";
        tr.appendChild(tdCompleted);

        const tdName = document.createElement("td");
        tdName.textContent = "Project " + row.constructionId + " - " + row.countryName;
        tr.appendChild(tdName);

        const tdDays = document.createElement("td");
        tdDays.textContent = row.durationDays;
        tr.appendChild(tdDays);

        tbody.appendChild(tr);
    }
};

// need to store the chart so we can destroy it before redrawing
let statusChartInstance = null;

// bar chart showing how many projects are active vs completed
const printStatusChart = async () => {
    // just counts projects and groups them by whether the end date has passed or not
    const sql = `
        SELECT
            CASE WHEN con.endDate >= CURDATE() THEN 'Active' ELSE 'Completed' END AS projectStatus,
            COUNT(DISTINCT con.constructionId) AS total
        FROM tblConstruction con
        GROUP BY projectStatus;`;

    const result = await runQuery(sql);

    if (!result || !result.data || result.data.length === 0) return;

    const labels = [];
    const values = [];

    for (let row of result.data) {
        labels.push(row.projectStatus);
        values.push(Number(row.total));
    }

    // destroy old chart first otherwise they stack on top of each other
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(document.querySelector("#constructionStatusChart"), {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Number of Projects",
                data: values,
                backgroundColor: ["#36a2eb", "#4bc0c0"]
            }]
        },
        options: {
            plugins: { title: { display: true, text: "Projects by Status" } },
            scales: { y: { beginAtZero: true } }
        }
    });
};

let timelineChartInstance = null;

// line chart showing how many projects started each year
const printTimelineChart = async () => {
    // groups by start year so we can see if construction activity is going up or down over time
    const sql = `
        SELECT YEAR(con.startDate) AS startYear, COUNT(DISTINCT con.constructionId) AS projectsStarted
        FROM tblConstruction con
        GROUP BY startYear
        ORDER BY startYear ASC;`;

    const result = await runQuery(sql);

    if (!result || !result.data || result.data.length === 0) return;

    const labels = [];
    const values = [];

    for (let row of result.data) {
        labels.push(row.startYear);
        values.push(Number(row.projectsStarted));
    }

    if (timelineChartInstance) timelineChartInstance.destroy();

    timelineChartInstance = new Chart(document.querySelector("#constructionTimelineChart"), {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Projects Started",
                data: values,
                borderColor: "#36a2eb",
                backgroundColor: "rgba(54, 162, 235, 0.2)",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            plugins: { title: { display: true, text: "Construction Activity Over Time" } },
            scales: { y: { beginAtZero: true } }
        }
    });
};

const addProject = async () => {
    const startDate = document.querySelector("#startDate").value;
    const endDate = document.querySelector("#endDate").value;
    const budget = document.querySelector("#budget").value;
    const communityId = document.querySelector("#communityId").value;
    const pointType = document.querySelector("#pointType").value;
    const message = document.querySelector("#constructionMessage");

    // basic validation
    if (!startDate || !endDate || !budget || !communityId || !pointType) {
        message.textContent = "Please fill in all fields.";
        return;
    }

    if (endDate <= startDate) {
        message.textContent = "End date must be after start date.";
        return;
    }

    if (budget <= 0) {
        message.textContent = "Budget must be greater than 0.";
        return;
    }

    // first insert the construction
    const sql1 = `INSERT INTO tblConstruction (startDate, endDate, budget) VALUES ('${startDate}', '${endDate}', ${budget});`;
    const result1 = await runQuery(sql1);

    if (!result1 || !result1.success) {
        message.textContent = "Failed to add project.";
        return;
    }

    // get the new constructionId
    const idResult = await runQuery("SELECT MAX(constructionId) AS newId FROM tblConstruction;");
    const newId = idResult.data[0].newId;
    
    // then insert the waterpoint linked to it
    const sql2 = `INSERT INTO tblWaterPoints (communityId, constructionId, pointType, isClean) VALUES (${communityId}, ${newId}, '${pointType}', 1);`;
    const result2 = await runQuery(sql2);
    

    if (result2 && result2.success) {
        message.textContent = "Project added successfully!";
        document.querySelector("#startDate").value = "";
        document.querySelector("#endDate").value = "";
        document.querySelector("#budget").value = "";
        document.querySelector("#communityId").value = "";
        document.querySelector("#pointType").value = "";
        printActiveProjects();
    } else {
        message.textContent = "Failed to add water point.";
    }
};

// loads communities into the dropdown
const loadCommunities = async () => {
    const select = document.querySelector("#communityId");

    const result = await runQuery("SELECT communityId, country, communityType FROM tblCommunity ORDER BY country ASC;");

    if (!result || !result.data) return;

    for (let row of result.data) {
        const option = document.createElement("option");
        option.value = row.communityId;
        option.textContent = row.country + " (" + row.communityType + ")";
        select.appendChild(option);
    }
};




// wait for the page to load then run everything
document.addEventListener("DOMContentLoaded", () => {
    printActiveProjects();
    printCompletedProjects();
    printStatusChart();
    printTimelineChart();
    loadCommunities();
});