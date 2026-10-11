
CREATE TABLE IF NOT EXISTS tblDonations(
    donationId INT AUTO_INCREMENT PRIMARY KEY,
    donationAmount INT NOT NULL,
    donationYear YEAR NOT NULL DEFAULT YEAR(CURDATE())
);

CREATE TABLE IF NOT EXISTS tblCommunity(
    communityId INT AUTO_INCREMENT PRIMARY KEY,
    country VARCHAR(60) NOT NULL,
    communityType ENUM('Rural', 'Urban', 'Suburban') NOT NULL
);

CREATE TABLE IF NOT EXISTS tblConstruction(
    constructionId INT AUTO_INCREMENT PRIMARY KEY,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    budget INT NOT NULL
);

CREATE TABLE IF NOT EXISTS tblWaterPoints(
    waterPointId INT AUTO_INCREMENT PRIMARY KEY,
    communityId INT NOT NULL,
    constructionId  INT NOT NULL,
    pointType VARCHAR(50) NOT NULL,
    isClean TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (communityId) REFERENCES tblCommunity(communityId),
    FOREIGN KEY (constructionId) REFERENCES tblConstruction(constructionId)
);

CREATE TABLE IF NOT EXISTS tblMaintenanceReport(
    reportId INT AUTO_INCREMENT PRIMARY KEY,
    waterPointId INT NOT NULL,
    reportDate DATE NOT NULL DEFAULT CURDATE(),
    pumpStatus ENUM('Operational', 'Needs Fixing', 'Broken') NOT NULL,
    FOREIGN KEY (waterPointId) REFERENCES tblWaterPoints(waterPointId)
);

CREATE TABLE IF NOT EXISTS tblLitresPumped(
    waterPointId INT NOT NULL,
    yearPumpedIn YEAR NOT NULL DEFAULT YEAR(CURDATE()),
    litresPumped INT NOT NULL,
    PRIMARY KEY (waterPointId, yearPumpedIn),
    FOREIGN KEY (waterPointId) REFERENCES tblWaterPoints(waterPointId)
);


CREATE TABLE IF NOT EXISTS tblConstructionDonations(
    donationId int NOT NULL,
    constructionId int NOT NULL,
    PRIMARY KEY (donationId, constructionId),
    FOREIGN KEY (donationId) REFERENCES tblDonations(donationId),
    FOREIGN KEY (constructionId) REFERENCES tblConstruction(constructionId)
);

CREATE TABLE IF NOT EXISTS tblCommunityInformation(
    communityId INT NOT NULL,
    communityYear YEAR NOT NULL DEFAULT YEAR(CURDATE()),
    population BIGINT NOT NULL,
    litresConsumed BIGINT NOT NULL,
    PRIMARY KEY (communityId, communityYear),
    FOREIGN KEY (communityId) REFERENCES tblCommunity(communityId)
);

