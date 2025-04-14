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
const cronJobStoreArchivedVideoUsers = cron.schedule(process.env.CRON_START_TIME_ARCHIVED_VIDEO_USERS, async() => {
    const selectedVideosWithArchivedDates = await databaseService.selectedVideosWithArchivedDates();
    if (selectedVideosWithArchivedDates && selectedVideosWithArchivedDates.rows && selectedVideosWithArchivedDates.rowCount > 0) {
        await archivedVideoUsers.storeArchivedVideoUsers(selectedVideosWithArchivedDates);
    }
});

// cronJobRemoveOldRows
cronJobRemoveFourMonthsOlder = cron.schedule(process.env.CRON_START_TIME_REMOVE_USERS, async() => {
    console.log('Run cronJobRemoveOldRows once a week sunday morning 03:00');
    await deletedVideos.deleteArchivedVideoUsers();
});

module.exports.cronJob = cronJob;
module.exports.cronJobStoreArchivedVideoUsers = cronJobStoreArchivedVideoUsers;
module.exports.cronJobRemoveFourMonthsOlder = cronJobRemoveFourMonthsOlder;
