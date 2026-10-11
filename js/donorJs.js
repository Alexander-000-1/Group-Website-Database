// Validate donation amount
const validateDonor = (donor) => {
    const amount = Number(donor.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
        return "Amount must be a whole number greater than 0.";
    }
    return "";
};

// chart
let donationChart = null;

document.addEventListener("DOMContentLoaded", () => {

    function openEditPopup(id, amount) {
        // get the current values
        document.querySelector("#editDonationId").value = id;
        document.querySelector("#editAmount").value = amount;

        // show the popup
        document.querySelector("#editPopup").style.display = "block";
    }

    async function deleteDonation(id) {
        if (!confirm("Are you sure you want to delete this donation?")) return;

        // delete from database
        const sql = `DELETE FROM tblDonations WHERE donationId = ${id}`;
        await runQuery(sql);

        printDonorTable();
    }

    const printDonorTable = async () => {
        // clear previous output
        const output = document.querySelector("#tableOutput");
        output.textContent = "";

        // get data from database
        const sql = "SELECT donationId, donationYear, donationAmount FROM tblDonations ORDER BY donationId;";
        const result = await runQuery(sql);

        if (!result || !result.data || result.data.length === 0) {
            output.textContent = "No Rows Returned";
            return;
        }

        const rows = result.data;
        const table = document.createElement("table");

        const headerRow = document.createElement("tr");
        table.appendChild(headerRow);

        // create table headers
        const headings = ["Donation ID", "Amount (GBP)", "Year", "Edit/Delete"];
        for (let heading of headings) {
            const th = document.createElement("th");
            th.textContent = heading;
            headerRow.appendChild(th);
        }

        // create table rows
        for (let row of rows) {
            const tr = document.createElement("tr");

            const tdId = document.createElement("td");
            tdId.textContent = row.donationId;
            tr.appendChild(tdId);

            const tdAmount = document.createElement("td");
            tdAmount.textContent = row.donationAmount;
            tr.appendChild(tdAmount);

            const tdYear = document.createElement("td");
            tdYear.textContent = row.donationYear;
            tr.appendChild(tdYear);

            const tdActions = document.createElement("td");

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.classList.add("edit-btn");
            editBtn.onclick = () => openEditPopup(row.donationId, row.donationAmount);
            tdActions.appendChild(editBtn);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.classList.add("delete-btn");
            deleteBtn.onclick = () => deleteDonation(row.donationId);
            tdActions.appendChild(deleteBtn);

            tr.appendChild(tdActions);

            table.appendChild(tr);
        }

        // add table to page
        output.appendChild(table);
    };

    // cancel edit
    document.querySelector("#cancelEdit").onclick = () => {
        document.querySelector("#editPopup").style.display = "none";
    };

    // submit edit
    document.querySelector("#editForm").addEventListener("submit", async (e) => {
        // stop form from reloading page
        e.preventDefault();

        // get values from form
        const id = document.querySelector("#editDonationId").value;
        const amount = document.querySelector("#editAmount").value;

        // validate values
        const error = validateDonor({amount});
        if (error) {
            showMessage(error, "error");
            return;
        }

        // update database
        const sql = `UPDATE tblDonations 
                    SET donationAmount = ${amount} 
                    WHERE donationId = ${id}`;

        await runQuery(sql);

        // hide popup and refresh table
        document.querySelector("#editPopup").style.display = "none";
        printDonorTable();
    });

    const updateChart = (labels, data, labelText) => {
    const chartCanvas = document.querySelector("#marksChart");

    document.querySelector(".chart-panel").style.display = "block";
    
    if (donationChart) donationChart.destroy();

    donationChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: labelText,
                data,
                backgroundColor: "#cc0000",
                borderColor: "#7a0000",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
    };

    // Insert donation
    document.querySelector("#donationForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const donation = {
            amount: document.querySelector("#amount").value,
            year: new Date().getFullYear()
        };

        const error = validateDonor(donation);
        if (error) {
            showMessage(error, "error");
            return;
        }

        const sql = `
        INSERT INTO tblDonations (donationYear, donationAmount)
        VALUES (${donation.year}, ${donation.amount});
        `;

        const result = await runQuery(sql);

        if (result && result.success) {
            showMessage("Donation added successfully!", "success");
            document.querySelector("#donationForm").reset();
            printDonorTable();
        } else {
            showMessage(result?.error || "Insert failed.", "error");
        }
    });

    // report
    document.querySelectorAll(".reportBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const report = btn.dataset.report;
            let sql = "";

            switch (report) {
                case "total":
                sql = `SELECT SUM(donationAmount) AS 'Amount (GBP)', donationYear AS 'Year'
                    FROM tblDonations
                    GROUP BY donationYear;`;
                break;

                case "highest":
                sql = `SELECT 
                    d.donationId AS 'Donation ID',
                    d.donationAmount AS 'Amount (GBP)'
                    FROM tblDonations d 
                    ORDER BY d.donationAmount DESC
                    LIMIT 3;`;
                break;

                case "impact":
                sql =`SELECT
                        con.constructionId AS 'Construction ID',
                        UPPER(c.country) AS 'Country',
                        COUNT(DISTINCT wp.waterPointId) AS 'Pumps Being Built',
                        SUM(d.donationAmount) AS 'Total Donations Received',
                        SUM(ci.population) AS 'Total People Affected',
                        COALESCE(SUM(lp.litresPumped), 0) AS 'Total Litres Pumped',
                        SUM(ci.litresConsumed) AS 'Total Litres Consumed',
                        ROUND(
                            COALESCE(SUM(lp.litresPumped), 0) / NULLIF(SUM(ci.population), 0), 2) 
                            AS 'Litres Per Person'
                    FROM tblConstruction con
                    JOIN tblWaterPoints wp  ON con.constructionId = wp.constructionId
                    JOIN tblCommunity c ON wp.communityId = c.communityId
                    JOIN tblCommunityInformation ci  ON c.communityId = ci.communityId
                    JOIN tblConstructionDonations cd  ON con.constructionId = cd.constructionId
                    JOIN tblDonations d ON cd.donationId = d.donationId
                    LEFT JOIN tblLitresPumped lp  ON wp.waterPointId = lp.waterPointId
                    GROUP BY con.constructionId, c.country
                    ORDER BY 'Total People Affected' DESC;`;
                break;

                case "perCountry":
                sql = `SELECT
                    UPPER(c.country) AS 'Country',
                    COUNT(d.donationId) AS 'Total Donations',
                    SUM(d.donationAmount) AS 'Total Amount Received',
                    MAX(d.donationAmount) AS 'Largest Donation',
                    MIN(d.donationAmount) AS 'Smallest Donation',
                    ROUND(AVG(d.donationAmount), 2) AS 'Average Donation'
                    FROM tblDonations d
                    JOIN tblConstructionDonations cd ON d.donationId = cd.donationId
                    JOIN tblConstruction con ON cd.constructionId = con.constructionId
                    JOIN tblWaterPoints wp ON con.constructionId = wp.constructionId
                    JOIN tblCommunity c ON wp.communityId = c.communityId
                    GROUP BY c.country
                    ORDER BY 'Total Amount Received' DESC;`;
                break;
            }

            const result = await runQuery(sql);

            const output = document.querySelector("#reportOutput");
            output.textContent = "";

            if (!result || !result.data || result.data.length === 0) {
                output.textContent = "No Rows Returned";
                return;
            }

            const rows = result.data;

            // build report table
            const table = document.createElement("table");
            const headerRow = document.createElement("tr");
            table.appendChild(headerRow);

            const headings = Object.keys(rows[0]);
            headings.forEach(h => {
                const th = document.createElement("th");
                th.textContent = h;
                headerRow.appendChild(th);
            });

            rows.forEach(row => {
                const tr = document.createElement("tr");
                headings.forEach(h => {
                    const td = document.createElement("td");
                    td.textContent = row[h];
                    tr.appendChild(td);
                });
                table.appendChild(tr);
            });

            output.appendChild(table);

            // update chart based on report selected
            switch (report) {
                case "total":
                    updateChart(
                        rows.map(r => r.Year),
                        rows.map(r => Number(r["Amount (GBP)"])),
                        "Total Donations Per Year"
                    );
                    break;

                case "highest":
                    updateChart(
                        rows.map(r => "ID " + r["Donation ID"]),
                        rows.map(r => Number(r["Amount (GBP)"])),
                        "Amount (GBP)"
                    );
                    break;

                case "impact":
                    updateChart(
                        rows.map(r => "ID " + r["Construction ID"]),
                        rows.map(r => Number(r["Litres Per Person"])),
                        "Litres Pumped Per Person"
                    );
                    break;

                case "perCountry":
                    updateChart(
                        rows.map(r => r["Country"]),
                        rows.map(r => Number(r["Total Amount Received"])),
                        "Total Donations per Country"
                    );
                    break;
            }
        });
    });

    printDonorTable();
});

// Show success/error messages
const showMessage = (text, type) => {
    const output = document.querySelector("#message");
    output.textContent = text;
    output.className = `message ${type}`;
};