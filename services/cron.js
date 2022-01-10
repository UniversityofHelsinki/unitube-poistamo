const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const database = require("./database");
const archivedVideos = require('./archivedVideos');

// ARCHIVE CRON JOB
archiveCron = cron.schedule('0 0 * * *', async() => {
    console.log('Run CronJob job daily at 00:00');
    const selectVideosWithArchivedDates = fs.readFileSync(path.resolve(__dirname, "../sql/getVideosWithArchivedDate.sql"), "utf8");
    const selectedVideos = await database.pool.query(selectVideosWithArchivedDates);
    if (selectedVideos && selectedVideos.rows && selectedVideos.rowCount > 0) {
        await archivedVideos.archiveVideos(selectedVideos.rows);
    }
});

module.exports.archiveCron = archiveCron;
