const cron = require("node-cron");
const archivedVideos = require('./archivedVideos');
const deletedVideos = require('./deletedVideos');
const databaseService = require('./databaseService');
const archivedVideoUsers = require("./archivedVideoUsers");

// CRONJOB
const cronJob = cron.schedule(process.env.CRON_START_TIME, async() => {
    console.log('Run CronJob job daily at 00:00');
    const selectedVideosWithArchivedDates = await databaseService.selectedVideosWithArchivedDates();
    if (selectedVideosWithArchivedDates && selectedVideosWithArchivedDates.rows && selectedVideosWithArchivedDates.rowCount > 0) {
        await archivedVideos.archiveVideos(selectedVideosWithArchivedDates.rows);
    }
    const selectedVideosToDelete = await databaseService.selectedVideosToBeDeleted();
    if (selectedVideosToDelete && selectedVideosToDelete.rows && selectedVideosToDelete.rowCount > 0) {
        await deletedVideos.deleteVideos(selectedVideosToDelete.rows);
    }
});

// CRONJOB users of archived videos
const cronJobStoreArchivedVideoUsers = cron.schedule(process.env.CRON_START_TIME_ARHIVED_VIDEO_USERS, async() => {
    const selectedVideosWithArchivedDates = await databaseService.selectedVideosWithArchivedDates();
    if (selectedVideosWithArchivedDates && selectedVideosWithArchivedDates.rows && selectedVideosWithArchivedDates.rowCount > 0) {
        await archivedVideoUsers.storeArchivedVideoUsers(selectedVideosWithArchivedDates);
    }
});

module.exports.cronJob = cronJob;
module.exports.cronJobStoreArchivedVideoUsers = cronJobStoreArchivedVideoUsers;
