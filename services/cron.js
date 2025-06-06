const cron = require("node-cron");
const archivedVideos = require('./archivedVideos');
const deletedVideos = require('./deletedVideos');
const databaseService = require('./databaseService');
const archivedVideoUsers = require("./archivedVideoUsers");
const cleanedVideos = require("./cleanedVideos");

// CRONJOB
const cronJob = cron.schedule(process.env.CRON_START_TIME, async() => {
    console.log('Run CronJob job daily at 00:00');
    const selectedVideosWithArchivedDates = await databaseService.selectedVideosWithArchivedDates();
    if (selectedVideosWithArchivedDates && selectedVideosWithArchivedDates.rows && selectedVideosWithArchivedDates.rowCount > 0) {
        await archivedVideos.archiveVideos(selectedVideosWithArchivedDates.rows);
    }

    const selectedVideosToDelete = await databaseService.selectedVideosToBeDeleted();

    if (selectedVideosToDelete && selectedVideosToDelete.rows && selectedVideosToDelete.rowCount > 0) {
        await archivedVideoUsers.storeArchivedVideoUsers(selectedVideosToDelete);
    }
    if (selectedVideosToDelete && selectedVideosToDelete.rows && selectedVideosToDelete.rowCount > 0) {
        await deletedVideos.deleteVideos(selectedVideosToDelete.rows);
    }

    const selectedVideosToBeCleanedUp = await databaseService.selectedVideosToBeCleanedUp();

    if (selectedVideosToBeCleanedUp && selectedVideosToBeCleanedUp.rows && selectedVideosToBeCleanedUp.rowCount > 0) {
        await cleanedVideos.cleanVideos(selectedVideosToBeCleanedUp.rows);
    }


});

// cronJobRemoveOldRows
const cronJobRemoveFourMonthsOlder = cron.schedule(process.env.CRON_START_TIME_REMOVE_USERS, async() => {
    console.log('Run cronJobRemoveOldRows once a week sunday morning 03:00');
    await deletedVideos.deleteArchivedVideoUsers();
});

module.exports.cronJob = cronJob;
module.exports.cronJobRemoveFourMonthsOlder = cronJobRemoveFourMonthsOlder;
