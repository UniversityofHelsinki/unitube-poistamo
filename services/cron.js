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
const chapterGeneratorService = require('./chapterGeneratorService');

const IMPORTED_UNIT_TYPES = new Set([
    'tiedekunta',
    'lailla-erikseen-saadetty-laitos',
    'ulkopuolisten-kanssa-yhteinen-laitos',
    'palveluyksikko',
    'rehtorin-alainen-erillinen-laitos',
    'tdk-yhteinen-toimintayksikko',
]);

const mapFacultyDepartment = (unit) => {
    return {
        uniqueId: Number(unit.uniqueId),
        unitType: String(unit.type ?? ''),
        nameFi: String(unit.nameFi ?? ''),
        nameSv: String(unit.nameSv ?? ''),
        nameEn: String(unit.nameEn ?? ''),
    };
};

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

    /* DO NOT PUT MOODLE IN SERIES VISIBILITY
    const moodleAclInstructor = series.roles.filter(role => role.role.includes(constants.MOODLE_ACL_INSTRUCTOR));
    const moodleAclLearner = series.roles.filter(role => role.role.includes(constants.MOODLE_ACL_LEARNER));

    if (moodleAclInstructor && moodleAclLearner && moodleAclInstructor.length > 0 && moodleAclLearner.length > 0) {
        visibility.push(constants.STATUS_MOODLE);
    }
    */
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


}, {
    scheduled: false // This prevents it from starting immediately
});

// cronJobRemoveOldRows
const cronJobRemoveArchivedVideoUsers = cron.schedule(process.env.CRON_START_TIME_REMOVE_USERS, async() => {
    console.log('Run cronJobRemoveOldRows once a week sunday morning 03:00');
    await deletedVideos.deleteArchivedVideoUsers();
}, {
    scheduled: false // This prevents it from starting immediately
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

const importFacultiesDepartments = async () => {
    const apiUrl = process.env.FACULTIES_DEPARTMENTS_API_URL;
    const apiKey = process.env.FACULTIES_DEPARTMENTS_API_KEY;
    if (!apiUrl) {
        throw new Error('FACULTIES_DEPARTMENTS_API_URL is not set');
    }

    const response = await fetch(apiUrl, {
        headers: {
            'X-Api-Key': apiKey,
        },
    });
    if (!response.ok) {
        throw new Error(`Faculty API returned ${response.status}`);
    }

    const payload = await response.json();
    const units = Array.isArray(payload)
        ? payload
        : payload?.units || payload?.data || payload?.results || [];

    if (!Array.isArray(units)) {
        throw new Error('Faculty API response does not contain an array of units');
    }

    const mappedUnits = units
        .filter(unit => IMPORTED_UNIT_TYPES.has(unit.type))
        .map(mapFacultyDepartment);
    for (const unit of mappedUnits) {
        if (!Number.isInteger(unit.uniqueId) || !unit.unitType ||
            !unit.nameFi || !unit.nameSv || !unit.nameEn) {
            throw new Error(`Invalid faculty/department record: ${JSON.stringify(unit)}`);
        }

        await databaseService.upsertFacultyDepartment(unit);
    }

    console.log(`Imported ${mappedUnits.length} faculty/department records`);
};

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
        created: eventData.created || null,
        license: eventData.license
    };

    if (process.env.LANGUAGE_DETECTION_ENABLED === 'true' && visibility.includes(constants.STATUS_PUBLISHED)) {
        const detectedLanguage = await detectLanguage(mediaItem.name, mediaItem.description);
        mediaItem.language = detectedLanguage;
        console.log(`Added language: ${detectedLanguage} to video: ${mediaItem.external_identifier}`);
    }

    const mediaItemId = await databaseService.upsertMediaItem(mediaItem);

    if (process.env.CHAPTER_DETECTION_ENABLED === 'true' && (visibility.includes(constants.STATUS_PUBLISHED) || visibility.includes(constants.STATUS_UNLISTED))) {
        const VTTFiles = await apiService.getVTTFilesForEvent(eventData);
        if (VTTFiles && VTTFiles.length > 0) {
            for (const vttFile of VTTFiles) {
                const tags = vttFile.tags || [];
                const langTag = tags.find(tag => tag.startsWith('lang:'));
                const lang = langTag ? langTag.split(':')[1] : 'und';

                try {
                    const vttContent = await apiService.getVTTFileContent(vttFile.uri);
                    const chapters = await chapterGeneratorService.generateChapters(vttContent, lang);
                    if (chapters) {
                        await databaseService.upsertChapter(mediaItemId, lang, chapters);
                        console.log(`Added chapters for language: ${lang} to video: ${mediaItem.external_identifier}`);
                    }
                } catch (error) {
                    console.error(`Error generating chapters for language ${lang} of video ${mediaItem.external_identifier}:`, error.message);
                }
            }
        }
    }

    //  transcription language for mediaitem to mediaitem_transcriptions table
    const VTTFiles = await apiService.getVTTFilesForEvent(eventData);
    if (VTTFiles && VTTFiles.length > 0) {
        for (const vttFile of VTTFiles) {
            const tags = vttFile.tags || [];
            const langTag = tags.find(tag => tag.startsWith('lang:'));
            const lang = langTag ? langTag.split(':')[1] : 'und';

            // Extract filename from element-description URL
            const description = vttFile['element-description'];
            const urlParts = description ? description.split('/') : [];
            const filename = urlParts.length > 0 ? urlParts[urlParts.length - 1] : '';

            await databaseService.upsertTranscriptionLanguage(mediaItemId, lang, filename);
        }
    }

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
module.exports.importFacultiesDepartments = importFacultiesDepartments;
