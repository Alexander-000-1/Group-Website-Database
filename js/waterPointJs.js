//Global variables available throughout script
let countryInput = document.querySelector("#countrySearch");
let communityInput = document.querySelector("#communitySearch");

const printTable = async () => {
    const output = document.querySelector("#tableOutput");
    const error = document.querySelector("#errorMessage");
    const mode = document.querySelector("#displayMenu").value;
    error.textContent = "";
    error.classList.remove("errorMessage");

    const country = countryInput.value.trim();
    const community = communityInput.value;

    if (mode === "Search") {
        if (country === "") {
            error.textContent = "Invalid country"
            error.classList.add("errorMessage");
            return;
        }
        if (community === "") {
            error.textContent = "Invalid Community"
            error.classList.add("errorMessage");
            return;
        }
    }

    let sql = `SELECT
                wp.waterPointId,
                wp.pointType,
                wp.isClean,
                UPPER(c.country) AS countryName,
                ci.communityYear,
                SUM(ci.population) AS totalPopulation,
                SUM(lp.litresPumped) AS totalLitresPumped,
                SUM(ci.litresConsumed) AS totalLitresConsumed
            FROM tblWaterPoints wp
            JOIN tblCommunity c ON wp.communityId = c.communityId
            JOIN tblCommunityInformation ci ON c.communityId = ci.communityId
            JOIN tblConstruction con ON wp.constructionId = con.constructionId
            JOIN tblLitresPumped lp ON wp.waterPointId = lp.waterPointId
                AND ci.communityYear = lp.yearPumpedIn`;
    if (mode === "Search") {
        sql += `
                WHERE c.country = '${country}' AND c.communityType = '${community}'
                `;
    }
    sql += `
            GROUP BY wp.waterPointId, wp.pointType, c.country, ci.communityYear
            ORDER BY totalPopulation DESC, c.country ASC;`;

    const result = await runQuery(sql);

    const rows = result.data;

    console.log(rows);

    if (!result || rows.length === 0) {
        error.textContent = "No Rows Returned";
        error.classList.add("errorMessage");
        return;
    } else {
        output.textContent = ""; //will only clear output if table is outputing data
    }

    const table = document.createElement("table");
    const headerRow = document.createElement("tr");
    table.appendChild(headerRow);

    const thCommunityYear = document.createElement("th");
    const thPointId = document.createElement("th");
    const thPointType = document.createElement("th");
    const thIsClean = document.createElement("th");
    const thCountry = document.createElement("th");
    const thPopulation = document.createElement("th");
    const thPumped = document.createElement("th");
    const thConsumed = document.createElement("th");

    thCommunityYear.textContent = "Year";
    thPointId.textContent = "Water Point ID";
    thPointType.textContent = "Water Point Type";
    thIsClean.textContent = "Water Quality";
    thCountry.textContent = "Country";
    thPopulation.textContent = "Total Population";
    thPumped.textContent = "Litres of water pumped";
    thConsumed.textContent = "Litres of water consumed";

    headerRow.appendChild(thCommunityYear);
    headerRow.appendChild(thPointId);
    headerRow.appendChild(thPointType);
    headerRow.appendChild(thIsClean);
    headerRow.appendChild(thCountry);
    headerRow.appendChild(thPopulation);
    headerRow.appendChild(thPumped);
    headerRow.appendChild(thConsumed);

    for (let row of rows) {
        const tr = document.createElement("tr");

        const tdCommunityYear = document.createElement("td");
        const tdPointId = document.createElement("td");
        const tdPointType = document.createElement("td");
        const tdIsClean = document.createElement("td");
        const tdCountry = document.createElement("td");
        const tdPopulation = document.createElement("td");
        const tdPumped = document.createElement("td");
        const tdConsumed = document.createElement("td");

        tdPointId.textContent = row.waterPointId;
        tdPointType.textContent = row.pointType;

        if (row.isClean == 1) {
            tdIsClean.textContent = "Clean";
        } else {
            tdIsClean.textContent = "Dirty";
        }

        tdCountry.textContent = row.countryName;
        tdCommunityYear.textContent = row.communityYear;
        tdPopulation.textContent = row.totalPopulation;
        tdPumped.textContent = row.totalLitresPumped;
        tdConsumed.textContent = row.totalLitresConsumed;

        tr.appendChild(tdCommunityYear);
        tr.appendChild(tdPointId);
        tr.appendChild(tdPointType);
        tr.appendChild(tdIsClean);
        tr.appendChild(tdCountry);
        tr.appendChild(tdPopulation);
        tr.appendChild(tdPumped);
        tr.appendChild(tdConsumed);

        table.appendChild(tr);
    }
    tableOutput.appendChild(table);
}

document.querySelector("#searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    printTable();
});

const changeDisplay = () => {
    //checks for value of display menu
    const mode = document.querySelector("#displayMenu").value;
    if (mode == "Search") {
        //removes css that hides input buttons
        document.getElementById("inputArea").classList.remove("hideButtons");
    } else {
        //adds css that hides input buttons
        document.getElementById("inputArea").classList.add("hideButtons");
        printTable();
    }
}

const clearCanvas = () => {
    document.getElementById("percentageChartDisplay").classList.add("hidden");
}

const printChart = async () => {
    document.getElementById("percentageChartDisplay").classList.remove("hidden");
    const output = document.querySelector("#percentageChartOutput");
    output.textContent = "";
    output.classList.remove("errorMessage");

    //Checks canvas if there is an existing chart
    const canvas = document.getElementById("percentageChart");
    const existingChart = Chart.getChart(canvas);

    // If an instance exists, destroy it
    if (existingChart) {
        existingChart.destroy();
    }

    const countryInput = document.querySelector("#countrySelect");
    const yearInput = document.querySelector("#yearSelect");

    const country = countryInput.value.trim();
    const year = yearInput.value;

    if (country === "") {
        output.classList.add("errorMessage");
        clearCanvas();
        output.textContent = "No Country name Entered"
        return;
    }

    
    if (year < 2000) {
        output.classList.add("errorMessage");
        clearCanvas();
        output.textContent = "Invalid year"
        return;
    }

    const sql = `SELECT pc.communityType, pc.population, 
                            CASE
                                WHEN (wp.litresPumped / pc.litresConsumed) * 100 > 100 THEN 100
                                ELSE ROUND((wp.litresPumped / pc.litresConsumed) * 100, 0)
                                END AS percentageCleanWaterConsumed
                        FROM vwCommunityPopConsumption pc
                        JOIN vwCommunityWaterPumped wp ON
                            pc.communityType = wp.communityType
                        WHERE pc.country = '${country}'
                        AND pc.communityYear = '${year}'
                        AND wp.yearPumpedIn = '${year}';`
    console.log(sql);

    const result = await runQuery(sql);
    console.log(result);

    const rows = result.data;
    const labels = [];
    const waterPercents = [];

    // If nothing is returned, show a message instead of building a table.
    if (!result || rows.length === 0) {
        output.classList.add("errorMessage");
        output.textContent = "No Rows Returned";
        clearCanvas();
        return;
    }
    for (let row of rows) {
        labels.push(`${row.communityType} pop: ${row.population}`);
        waterPercents.push(Number(row.percentageCleanWaterConsumed));
    }

    console.log(labels);
    console.log(waterPercents);

    const chartCanvas = document.querySelector("#percentageChart");

    barChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Percentage of population with access to clean water",
                data: waterPercents
            }]
        }
    });
}
document.querySelector("#selectForm").addEventListener("submit", (event) => {
    event.preventDefault();
    printChart();
});


document.addEventListener("DOMContentLoaded", () => {
    clearCanvas();
});

