    //gets the number of each pump type given the country and community
    //the second query counts just how many of the pumps in that reigion are actually operational
const runSearch = async () => {
    const output = document.querySelector("#reportBanner");
    output.textContent = "";

    const countryInput = document.querySelector("#countrySearch");
    const communityInput = document.querySelector("#communityType");

    const country = countryInput.value.trim();
    const type = communityInput.value;

    if (country === "") {
        output.textContent = "Invalid country";
        return;
    }

    if (type === "") {
        output.textContent = "Invalid community type";
        return;
    }

    const sql = `SELECT w.pointType,
        COUNT(*) AS numberOfEachType
    FROM tblWaterPoints AS w
    JOIN tblCommunity c ON w.communityId = c.communityId
    WHERE c.country = '${country}'
    AND c.communityType = '${type}'
    GROUP BY w.pointType
    ORDER BY w.pointType ASC;`

    const result = await runQuery(sql);
    const rows = result.data;

    if (!result || rows.length === 0) {
        output.textContent = "No Rows Returned";
        return;
    }

    const sql2 = `SELECT 
    COUNT(DISTINCT w.waterPointId) AS activePumps
FROM tblCommunity c
LEFT JOIN tblWaterPoints w ON c.communityId = w.communityId
LEFT JOIN vwLatestPumpStatus m ON w.waterPointId = m.waterPointId
WHERE c.country = '${country}'
AND c.communityType = '${type}'
AND m.pumpStatus = 'Operational'
GROUP BY c.country;`

    const result2 = await runQuery(sql2);
    const rows2 = result2.data;

    if (!result2 || rows2.length === 0) {
        output.textContent = "Water point types in " + country + " (" + type + ") | Active pumps: 0";
    } else {
        //adds up the total number of water points across all pump types to digplay the total
        output.textContent = "Water point types in " + country + " (" + type + ") | Operational pumps: " + rows2[0].activePumps + " out of " + rows.reduce((sum, row) => sum + Number(row.numberOfEachType), 0);
    }



    const cells = document.querySelector("#dataRow").cells;
    cells[0].textContent = "0";
    cells[1].textContent = "0";
    cells[2].textContent = "0";
    cells[3].textContent = "0";
    cells[4].textContent = "0";

    for (let row of rows) {
        if (row.pointType === "Hand Pump") cells[0].textContent = row.numberOfEachType;
        if (row.pointType === "Solar Pump") cells[1].textContent = row.numberOfEachType;
        if (row.pointType === "Diesel Pump") cells[2].textContent = row.numberOfEachType;
        if (row.pointType === "Electric Pump") cells[3].textContent = row.numberOfEachType;
        if (row.pointType === "Motorised Pump") cells[4].textContent = row.numberOfEachType;
    }
}

document.querySelector("#searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch();
});
//java method to display all the communities and their unique community ID
//the table also has edit and delete buttons for each row that is displayed
const showAllCommunities = async () => {
    const output = document.querySelector("#communityListOutput");
    output.textContent = "";

    const sql = `SELECT communityId, country, communityType
             FROM tblCommunity
            ORDER BY communityId ASC;`

    const result = await runQuery(sql);
    const rows = result.data;

    if (!result || rows.length === 0) {
        output.textContent = "No Rows Returned";
        return;
    }

    const table = document.createElement("table");
    const headerRow = document.createElement("tr");
    table.appendChild(headerRow);

    const thId = document.createElement("th");
    const thCountry = document.createElement("th");
    const thType = document.createElement("th");
    const thActions = document.createElement("th");

    thId.textContent = "Community ID";
    thCountry.textContent = "Country";
    thType.textContent = "Community Type";
    thActions.textContent = "Actions";

    headerRow.appendChild(thId);
    headerRow.appendChild(thCountry);
    headerRow.appendChild(thType);
    headerRow.appendChild(thActions);

    for (let row of rows) {
        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        const tdCountry = document.createElement("td");
        const tdType = document.createElement("td");
        const tdActions = document.createElement("td");

        tdId.textContent = row.communityId;
        tdCountry.textContent = row.country;
        tdType.textContent = row.communityType;

        // Edit button
        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.onclick = () => selectCommunity(row);
        tdActions.appendChild(editButton);
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", async () => {
            // Ask for confirmation before permanently deleting a community
            const shouldDelete = confirm(`Are you sure you want to delete community ${row.communityId}: ${row.country} (${row.communityType})? This action cannot be undone.`);
            if (!shouldDelete) {
                return;
            }

            // Remove the chosen community from the database
            const deleteSql = `DELETE FROM tblCommunity WHERE communityId = ${row.communityId}`;
            const deleteResult = await runQuery(deleteSql);

            if (deleteResult && deleteResult.success) {
                showMessage("Community deleted successfully.", "success");

                // If the deleted community was selected in the form, reset it
                if (selectedCommunityId === Number(row.communityId)) {
                    document.querySelector("#editForm").reset();
                    selectedCommunityId = null;
                    document.querySelector("#selectedCommunityText").textContent = "Choose a community from the table first.";
                }

                showAllCommunities();
                return;
            }

            if (deleteResult && deleteResult.error) {
                showMessage(deleteResult.error, "error");
            } else {
                showMessage("Unable to delete community. It may have linked water point records.", "error");
            }
        });
        tdActions.appendChild(deleteButton);


        tr.appendChild(tdId);
        tr.appendChild(tdCountry);
        tr.appendChild(tdType);
        tr.appendChild(tdActions);

        table.appendChild(tr);
    }


    const scrollDiv = document.createElement("div");
    scrollDiv.style.overflowY = "auto";
    scrollDiv.style.height = "200px";
    scrollDiv.appendChild(table);
    output.appendChild(scrollDiv);
}
let demandChartInstance = null;

const printDemandChart = async () => {
    const output = document.querySelector("#demandOutput");
    output.textContent = "";

    const communityId = document.querySelector("#communityIdInput").value;

    if (communityId === "") {
        output.textContent = "Please enter a Community ID";
        return;
    }
    //uses a self join on tblCommunityInformation to compare each years data against the last
    const sql = `SELECT cInfo1.communityId,
        cInfo1.communityYear,
        cInfo1.population,
        cInfo1.population - cInfo2.population AS yearlyPopulationDifference,
        ROUND(((cInfo1.population - cInfo2.population) / cInfo2.population) * 100, 2) AS percentPopulationDifference,
        cInfo1.litresConsumed,
        cInfo1.litresConsumed - cInfo2.litresConsumed AS yearlyConsumptionDifference,
        ROUND(((cInfo1.litresConsumed - cInfo2.litresConsumed) / cInfo2.litresConsumed) * 100, 2) AS percentConsumptionDifference,
        c.country,
        c.communityType
    FROM tblCommunityInformation AS cInfo1
    JOIN tblCommunityInformation AS cInfo2
        ON cInfo1.communityId = cInfo2.communityId
        AND cInfo2.communityYear = (
            SELECT MAX(communityYear)
            FROM tblCommunityInformation
            WHERE communityId = cInfo1.communityId
            AND communityYear < cInfo1.communityYear
        )
            JOIN tblCommunity c ON cInfo1.communityId = c.communityId
    WHERE cInfo1.communityId = '${communityId}'
    ORDER BY cInfo1.communityYear ASC;`

    const result = await runQuery(sql);
    const rows = result.data;

    if (!result || rows.length === 0) {
        output.textContent = "No data found for this community ID";
        return;
    }

    const labels = [];
    const populationData = [];
    const litresData = [];

    for (let row of rows) {
        labels.push(row.communityYear);
        populationData.push(Number(row.population));
        litresData.push(Number(row.litresConsumed));
    }

    // Destroy old chart if it exists
    if (demandChartInstance) {
        demandChartInstance.destroy();
    }

    const chartCanvas = document.querySelector("#demandChart");

    demandChartInstance = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Population",
                    data: populationData,
                    borderColor: "blue",
                    backgroundColor: "rgba(0, 0, 255, 0.1)",
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: "Litres Consumed",
                    data: litresData,
                    borderColor: "green",
                    backgroundColor: "rgba(0, 255, 0, 0.1)",
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: {
                    display: true,
                    text: `Change in Water Demand Over Time - ${rows[0].country} (${rows[0].communityType})`
                }
            },
            scales: {
                x: { title: { display: true, text: "Year" } },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: "Population" }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: "Litres Consumed" },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

document.querySelector("#demandForm").addEventListener("submit", (event) => {
    event.preventDefault();
    printDemandChart();
});

let consumptionChartInstance = null;

const printConsumptionChart = async () => {
    const output = document.querySelector("#consumptionOutput");
    output.textContent = "";

    const communityId = document.querySelector("#consumptionIdInput").value;

    if (communityId === "") {
        output.textContent = "Please enter a Community ID";
        return;
    }
    //uses 2 litres a day as a baseline for estimated water intake for the day
    const sql = `SELECT c.communityId,
        c.communityYear,
        c.population,
        c.population * 2 * 365 AS estimatedConsumption,
        c.litresConsumed,
        c.litresConsumed - (c.population * 2 * 365) AS differenceBetweenActualAndEstimated,
        ROUND(((c.litresConsumed - (c.population * 2 * 365)) / (c.population * 2 * 365)) * 100, 2) AS percentDifference
    FROM tblCommunityInformation AS c
    WHERE c.communityId = '${communityId}'
    ORDER BY c.communityId ASC,
        c.communityYear DESC;`

    const result = await runQuery(sql);
    const rows = result.data;

    if (!result || rows.length === 0) {
        output.textContent = "No Rows Returned";
        return;
    }

    const labels = [];
    const estimatedData = [];
    const actualData = [];

    for (let row of rows) {
        labels.push(row.communityYear);
        estimatedData.push(Number(row.estimatedConsumption));
        actualData.push(Number(row.litresConsumed));
    }

    if (consumptionChartInstance) {
        consumptionChartInstance.destroy();
    }

    const chartCanvas = document.querySelector("#secondChart");

    consumptionChartInstance = new Chart(chartCanvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Estimated Consumption",
                    data: estimatedData,
                    backgroundColor: "rgba(255, 99, 132, 0.7)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1
                },
                {
                    label: "Actual Consumption",
                    data: actualData,
                    backgroundColor: "rgba(54, 162, 235, 0.7)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: {
                    display: true,
                    text: `Estimated vs Actual Water Consumption - Community ${communityId}`
                }
            },
            scales: {
                x: { title: { display: true, text: "Year" } },
                y: { title: { display: true, text: "Litres" } }
            }
        }
    });
}

document.querySelector("#consumptionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    printConsumptionChart();
});
showAllCommunities();

let selectedCommunityId = null;

const showMessage = (text, type) => {
    const output = document.querySelector("#message");
    output.textContent = text;
    output.className = `message ${type}`;
};
    //puts the selected communities details into the edit so that the user can make their changes
const selectCommunity = (community) => {
    selectedCommunityId = Number(community.communityId);
    document.querySelector("#editCountry").value = community.country;
    document.querySelector("#editCommunityType").value = community.communityType;
    document.querySelector("#selectedCommunityText").textContent = "Editing community " + community.communityId + ": " + community.country + " (" + community.communityType + ")";
};

// Update existing community
document.querySelector("#editForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedCommunityId) {
        showMessage("Please select a community from the table first.", "error");
        return;
    }

    const country = document.querySelector("#editCountry").value.trim();
    const type = document.querySelector("#editCommunityType").value;
    //it checks the form inputs before running the query, this prevents empty records beings ubmitted
    if (country === "") {
        showMessage("Please enter a country name.", "error");
        return;
    }

    if (type === "") {
        showMessage("Please select a community type.", "error");
        return;
    }

    const sql = `UPDATE tblCommunity
    SET country = '${country}',
        communityType = '${type}'
    WHERE communityId = ${selectedCommunityId};`

    const result = await runQuery(sql);

    if (result && result.success) {
        showMessage("Community updated successfully!", "success");
        showAllCommunities();
    } else {
        showMessage("Unable to update community.", "error");
    }
});

// Add new community
document.querySelector("#addCommunityBtn").addEventListener("click", async () => {
    const country = document.querySelector("#editCountry").value.trim();
    const type = document.querySelector("#editCommunityType").value;

    if (country === "") {
        showMessage("Please enter a country name.", "error");
        return;
    }

    if (type === "") {
        showMessage("Please select a community type.", "error");
        return;
    }

    const sql = `INSERT INTO tblCommunity (country, communityType)
    VALUES ('${country}', '${type}');`

    const result = await runQuery(sql);

    if (result && result.success) {
        showMessage("Community added successfully!", "success");
        document.querySelector("#editForm").reset();
        selectedCommunityId = null;
        document.querySelector("#selectedCommunityText").textContent = "Choose a community from the table first.";
        showAllCommunities();
    } else {
        showMessage("Unable to add community.", "error");
    }
});