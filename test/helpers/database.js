const fs = require('fs');
const path = require('path');
require('dotenv').config({path: path.resolve(__dirname, '../../.env')});
const Pool = require('pg-pool');
const client = require('../../services/database');

const setupTestDatabase = () => {
    let pool;
    let connection;
    const tables = fs.readFileSync(path.resolve(__dirname, '../../sql/createTablesNew.sql'), 'utf8')
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => /^CREATE TABLE IF NOT EXISTS\b/i.test(statement))
        .map(statement => statement.replace(/^CREATE TABLE/i, 'CREATE TEMPORARY TABLE'));

    beforeAll(async () => {
        pool = new Pool({
            user: process.env.POSTGRES_USER,
            host: process.env.HOST,
            database: process.env.DATABASE,
            password: process.env.PASSWORD,
            port: process.env.PORT,
            ssl: process.env.SSL ? true : false,
            max: 1
        });
        connection = await pool.connect();
        client.query = (text, values) => connection.query(text, values);
    });

    beforeEach(async () => {
        await client.query('BEGIN');
        await client.query('SET LOCAL search_path TO pg_temp');
        for (const table of tables) {
            await client.query(table);
        }
    });

    afterEach(async () => {
        if (connection) {
            await connection.query('ROLLBACK');
        }
    });

    afterAll(async () => {
        if (connection) {
            connection.release();
        }
        if (pool) {
            await pool.end();
        }
    });
};

module.exports = setupTestDatabase;