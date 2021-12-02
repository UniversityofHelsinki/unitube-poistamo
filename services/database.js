// Postgres client setup
const Pool = require("pg-pool");

module.exports = {
    pool : new Pool({
        user: process.env.POSTGRES_USER,
        host: process.env.HOST,
        database: process.env.DATABASE,
        password: process.env.PASSWORD,
        port: process.env.PORT,
        ssl: process.env.SSL ? true : false
    })
};
