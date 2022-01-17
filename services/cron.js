const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const database = require("./database");
const archivedVideos = require('./archivedVideos');
const databaseService = require('./databaseService');

// ARCHIVE CRONJOB
archiveCron = cron.schedule('*/5 * * * *', async() => {
    console.log('Run CronJob job daily at 00:00');
    const selectedVideosWithArchivedDates = await databaseService.selectedVideosWithArchivedDates();
    if (selectedVideosWithArchivedDates && selectedVideosWithArchivedDates.rows && selectedVideosWithArchivedDates.rowCount > 0) {
        await archivedVideos.archiveVideos(selectedVideosWithArchivedDates.rows);
    }
});

module.exports.archiveCron = archiveCron;
