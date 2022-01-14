const adminHost = process.env.POISTAMO_OPENCAST_HOST;
const username = process.env.POISTAMO_OPENCAST_USER;
const password = process.env.POISTAMO_OPENCAST_PASS;
const userpass = Buffer.from(`${username}:${password}`).toString('base64');
const auth = `Basic ${userpass}`;
const axios = require('axios');

module.exports.opencastBase = axios.create({
    baseURL: adminHost,
    headers: {'authorization': auth},
    validateStatus: () => { // https://github.com/axios/axios/issues/1143
        return true;        // without this axios might throw error on non 200 responses
    }
});
