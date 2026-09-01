'use strict';
require("dotenv").config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const database = require("./services/database");
const fs = require("fs");
const path = require("path");
const cron = require('./services/cron');
const databaseService = require("./services/databaseService");

const ipaddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
const port = process.env.OPENSHIFT_NODEJS_PORT || 3001;

app.use(compression());
app.use(helmet());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// CREATE TABLES
const createTables = fs.readFileSync(path.resolve(__dirname, "./sql/createTables.sql"), "utf8");

(async () => {
    try {
        await database.query(createTables);
        // await cron.runImportScript(); // IMPORT FROM OPENCAST
        // await cron.importFacultiesDepartments(); // IMPORT FACULTIES AND DEPARTMENTS FROM ORGANISATION REGISTRY
    } catch (error) {
        console.error('Error initializing database:', error);
    }
})();

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.get('/videos/:videoId/chapters/:lang.vtt', async (req, res) => {
    try {
        const { videoId, lang } = req.params;
        const vttContent = await databaseService.getChapter(videoId, lang);
        if (vttContent) {
            res.setHeader('Content-Type', 'text/vtt');
            res.send(vttContent);
        } else {
            res.status(404).send('Chapters not found');
        }
    } catch (error) {
        console.error('Error serving chapters:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, ipaddress, () => {
    console.log( 'Listening on ' + ipaddress + ', port ' + port );
});

// for the tests
module.exports = app;

(async () => {
    // START CRONJOB
    await cron.cronJob;
    await cron.cronJobRemoveArchivedVideoUsers;
})();
