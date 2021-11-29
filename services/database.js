// Postgres client setup
const { Pool } = require("pg");

module.exports = {
    pool : new Pool({
        user: process.env.postgres_user,
        host: process.env.host,
        database: process.env.database,
        password: process.env.password,
        port: process.env.port
    })
};
