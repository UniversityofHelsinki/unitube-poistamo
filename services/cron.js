const cron = require("node-cron");
const archivedVideos = require('./archivedVideos');
const deletedVideos = require('./deletedVideos');
const databaseService = require('./databaseService');
const archivedVideoUsers = require("./archivedVideoUsers");
const cleanedVideos = require("./cleanedVideos");
const apiService = require('./apiService');
const {getMediaFileMetadataForEvent} = require("./apiService");
const constants = require('../utils/constants');
const commonService = require('./commonService');
const {detectLanguage} = require("./languageDetectionService");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const setVisibilityForSeries = (series) => {
    const visibility = [];

    if (series.roles.map(role => role.role).includes(constants.ROLE_USER_UNLISTED)) {
        visibility.push(constants.STATUS_UNLISTED);
    } else if (commonService.publicRoleCount(series.roles) >= 1) { //video has both (constants.ROLE_ANONYMOUS, constants.ROLE_KATSOMO) roles
        visibility.push(constants.STATUS_PUBLISHED);
    } else {
        visibility.push(constants.STATUS_PRIVATE);
    }

    const moodleAclInstructor = series.roles.filter(role => role.role.includes(constants.MOODLE_ACL_INSTRUCTOR));
    const moodleAclLearner = series.roles.filter(role => role.role.includes(constants.MOODLE_ACL_LEARNER));

    if (moodleAclInstructor && moodleAclLearner && moodleAclInstructor.length > 0 && moodleAclLearner.length > 0) {
        visibility.push(constants.STATUS_MOODLE);
    }
    return [...new Set(visibility)];
};

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
const cronJobRemoveArchivedVideoUsers = cron.schedule(process.env.CRON_START_TIME_REMOVE_USERS, async() => {
    console.log('Run cronJobRemoveOldRows once a week sunday morning 03:00');
    await deletedVideos.deleteArchivedVideoUsers();
});

const runImportScript = async () => {
    const startTime = Date.now();
    console.log('Run runImportScript started');
    let successCount = 0;
    let errorCount = 0;
    try {
        const result = await databaseService.getVideosFromVideosTable();
        if (result && result.rows && result.rowCount > 0) {
            console.log(`Processing ${result.rowCount} videos...`);
            for (const row of result.rows) {
                try {
                    await processVideoRow(row);
                    successCount++;
                    if (successCount % 10 === 0 || successCount === result.rowCount) {
                        const currentTime = Date.now();
                        const elapsedMs = currentTime - startTime;
                        const avgMsPerVideo = elapsedMs / successCount;
                        const remainingVideos = result.rowCount - successCount;
                        const estimatedRemainingMs = remainingVideos * avgMsPerVideo;

                        const remMinutes = Math.floor(estimatedRemainingMs / 60000);
                        const remSeconds = Math.floor((estimatedRemainingMs % 60000) / 1000);

                        let progressMsg = `Processed ${successCount}/${result.rowCount} videos`;
                        if (remainingVideos > 0) {
                            progressMsg += ` (Estimated time remaining: ${remMinutes}m ${remSeconds}s)`;
                        }
                        console.log(progressMsg);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error processing video ID ${row.video_id}:`, error.message);
                }
            }
            console.log('All videos processed.');
        } else {
            console.log('No videos found to process.');
        }
    } catch (error) {
        console.error('Error in runImportScript:', error.message);
    } finally {
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;

        console.log('--- Import Report ---');
        console.log(`Total time: ${minutes}m ${seconds}s`);
        console.log(`Successfully processed: ${successCount}`);
        console.log(`Errors encountered: ${errorCount}`);
        console.log('----------------------');
    }
}

const processVideoRow = async (row) => {
    const event = await apiService.getEvent(row.video_id);

    let visibility = [];
    if (event.data && event.data.is_part_of) {
        visibility = await processSeries(event.data.is_part_of);
    } else {
        console.log(`No series found for video ID: ${row.video_id}`);
    }

    if (event.data && event.data.identifier) {
        await processMediaItem(event.data, visibility);
    }
};

const processMediaItem = async (eventData, visibility = []) => {
    const media = await apiService.getMediaForEvent(eventData);
    let duration = eventData.duration || 0;

    if (media && media.length > 0) {
        const mediaFileMetadata = await apiService.getMediaFileMetadataForEvent(eventData.identifier, media[0].id);
        if (mediaFileMetadata && mediaFileMetadata.duration) {
            duration = mediaFileMetadata.duration;
        }
    }

    const mediaItem = {
        external_identifier: eventData.identifier,
        name: eventData.title,
        description: eventData.description || '',
        collection_id: eventData.is_part_of || '',
        duration: duration,
        created: eventData.created,
        license: eventData.license,
        language: null
    };

    if (process.env.LANGUAGE_DETECTION_ENABLED === 'true' && visibility.includes(constants.STATUS_PUBLISHED)) {
        const detectedLanguage = await detectLanguage(mediaItem.name, mediaItem.description);
        mediaItem.language = detectedLanguage;
        console.log(`Added language: ${detectedLanguage} to video: ${mediaItem.external_identifier}`);
    }

    const mediaItemId = await databaseService.upsertMediaItem(mediaItem);

    if (media && media.length > 0) {
        for (const item of media) {
            await databaseService.upsertFlavor(mediaItemId, item);
        }
    }
};

const processSeries = async (seriesId) => {
    const series = await apiService.getSeries(seriesId);

    if (series.data) {
        const seriesAcl = await apiService.getEventAclsFromSeries(series.data.identifier);

        const visibility = setVisibilityForSeries({roles: seriesAcl || []});

        const collection = {
            external_identifier: series.data.identifier,
            title: series.data.title,
            description: series.data.description || '',
            visibility: visibility.join(','),
            license: series.data.license || '',
            opinfi: false
        };

        await databaseService.upsertCollection(collection);

        if (series.data.contributors) {
            for (const owner of series.data.contributors) {
                await databaseService.upsertOwner(series.data.identifier, owner);
            }
        }

        if (seriesAcl) {
            for (const acl of seriesAcl) {
                const accessRight = acl?.role;
                await databaseService.upsertAccessRights(series.data.identifier, accessRight);
            }
        }
        return visibility;
    }
    return [];
};

module.exports.cronJob = cronJob;
module.exports.cronJobRemoveArchivedVideoUsers = cronJobRemoveArchivedVideoUsers;
module.exports.runImportScript = runImportScript;
