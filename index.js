require("dotenv").config();
const express = require('express');
const app = express();
const port = 3000;
const database = require("./services/database");
const fs = require("fs");
const path = require("path");

// CREATE TABLES
const createTables = fs.readFileSync(path.resolve(__dirname, "./sql/createTables.sql"), "utf8");

database.pool.query(createTables);

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});
