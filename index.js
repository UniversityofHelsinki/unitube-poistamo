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

const ipaddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
const port = process.env.OPENSHIFT_NODEJS_PORT || 3001;

app.use(compression());
app.use(helmet());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// CREATE TABLES
const createTables = fs.readFileSync(path.resolve(__dirname, "./sql/createTables.sql"), "utf8");

database.query(createTables);

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.listen(port, ipaddress, () => {
    console.log( 'Listening on ' + ipaddress + ', port ' + port );
});

// for the tests
module.exports = app;

(async () => {
    // START CRONJOB
    await cron.cronJob;
    await cron.cronJobStoreAchivedVideoUsers;
})();
