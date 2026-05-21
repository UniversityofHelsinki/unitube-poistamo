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

const getEventInfoCronJob = async () => {
    console.log('Run getEventInfoCronJob every minute');
    try {
        const result = await databaseService.getVideosFromVideosTable();
        if (result && result.rows && result.rowCount > 0) {
            for (const row of result.rows) {
                try {
                    //await delay(1000); // 1 second delay between processing each video
                    console.log(`Calling getEvent for video ID: ${row.video_id}`);
                    const event = await apiService.getEvent(row.video_id);
                    console.log(`Successfully called getEvent for video ID: ${row.video_id}`);

                    if (event.data && event.data.identifier) {
                        // get media file
                        const media = await apiService.getMediaForEvent(event.data);
                        console.log('media data:', media);

                        let duration = event.data.duration || 0;

                        if (media && media.length > 0) {
                            const mediaFileMetadata = await apiService.getMediaFileMetadataForEvent(event.data.identifier, media[0].id);
                            console.log('media file metadata:', mediaFileMetadata);
                            if (mediaFileMetadata && mediaFileMetadata.duration) {
                                duration = mediaFileMetadata.duration;
                            }
                        }

                        const mediaItem = {
                            external_identifier: event.data.identifier,
                            name: event.data.title,
                            description: event.data.description || '',
                            collection_id: event.data.is_part_of || '',
                            duration: duration,
                            created: event.data.created,
                            license: event.data.license
                        };
                        console.log(`Upserting mediaItem for event ID: ${mediaItem.external_identifier}`);

                        if (process.env.LANGUAGE_DETECTION_ENABLED === 'true') {
                            console.log('detecting language')
                            const detectedLanguage = await detectLanguage(mediaItem.name, mediaItem.description);
                            console.log(`Detected language: ${detectedLanguage}`)
                        }

                        const mediaItemId = await databaseService.upsertMediaItem(mediaItem);

                        if (media && media.length > 0) {
                            for (const item of media) {
                                console.log(`Upserting flavor for mediaItem ID: ${mediaItemId}: ${item.type}`);
                                await databaseService.upsertFlavor(mediaItemId, item);
                            }
                        }
                    }

                    if (event.data && event.data.is_part_of) {
                        const seriesId = event.data.is_part_of;
                        console.log(`Calling getSeries for series ID: ${seriesId}`);
                        const series = await apiService.getSeries(seriesId);
                        console.log(`Successfully called getSeries for series ID: ${seriesId}`);

                        if (series.data) {
                            // get acl
                            const seriesAcl = await apiService.getEventAclsFromSeries(series.data.identifier);
                            console.log('series acl data:', seriesAcl);

                            const visibility = setVisibilityForSeries({roles: seriesAcl || []});

                            const collection = {
                                external_identifier: series.data.identifier,
                                title: series.data.title,
                                description: series.data.description || '',
                                visibility: visibility.join(','),
                                license: series.data.license || '',
                                opinfi: false
                            };
                            console.log(`Upserting collection for series ID: ${collection.external_identifier}`);
                            await databaseService.upsertCollection(collection);

                            if (series.data.contributors) {
                                for (const owner of series.data.contributors) {
                                    console.log(`Upserting owner for series ID: ${series.data.identifier}: ${owner}`);
                                    await databaseService.upsertOwner(series.data.identifier, owner);
                                }
                            }

                            if (seriesAcl) {
                                for (const acl of seriesAcl) {
                                    const accessRight = acl?.role;
                                    console.log(`Upserting accessRight for series ID: ${series.data.identifier}: ${accessRight}`);
                                    await databaseService.upsertAccessRights(series.data.identifier, accessRight);
                                }
                            }

                        }
                    } else {
                        console.log(`No series found for video ID: ${row.video_id}`);
                    }
                } catch (error) {
                    console.error(`Error processing video ID ${row.video_id}:`, error.message);
                }
            }
            console.log('All videos processed successfully.');
        }
    } catch (error) {
        console.error('Error in getEventInfoCronJob:', error.message);
    }
}

module.exports.cronJob = cronJob;
module.exports.cronJobRemoveArchivedVideoUsers = cronJobRemoveArchivedVideoUsers;
module.exports.getEventInfoCronJob = getEventInfoCronJob;
