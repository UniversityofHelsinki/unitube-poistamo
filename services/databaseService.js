const fs = require("fs");
const path = require("path");
const database = require("./database");
const Constants = require('../utils/constants');
const { subMonths, format } = require('date-fns');

const selectedVideosWithArchivedDates = async() => {
    const selectedVideosWithArchivedDatesSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getSelectedVideosToBeArchived.sql"), "utf8");
    return await database.query(selectedVideosWithArchivedDatesSQL);
};

const getVideosFromVideosTable = async() => {
    const getVideosFromVideosTable = fs.readFileSync(path.resolve(__dirname, "../sql/getVideosFromVideosTable.sql"), "utf8");
    return await database.query(getVideosFromVideosTable);
};

const upsertMediaItem = async(mediaItem) => {
    const upsertMediaItemSQL = fs.readFileSync(path.resolve(__dirname, "../sql/upsertMediaItem.sql"), "utf8");
    const result = await database.query(upsertMediaItemSQL, [
        mediaItem.external_identifier,
        mediaItem.name,
        mediaItem.description,
        mediaItem.collection_id,
        mediaItem.duration,
        mediaItem.created
    ]);
    if (result.rows.length > 0) {
        return result.rows[0].id;
    }
};

const upsertFlavor = async(mediaItemId, flavor) => {
    const upsertFlavorSQL = fs.readFileSync(path.resolve(__dirname, "../sql/upsertFlavor.sql"), "utf8");
    return await database.query(upsertFlavorSQL, [
        mediaItemId,
        flavor.mimetype,
        flavor.type,
        flavor.url
    ]);
};

const upsertCollection = async(collection) => {
    const upsertCollectionSQL = fs.readFileSync(path.resolve(__dirname, "../sql/upsertCollection.sql"), "utf8");
    return await database.query(upsertCollectionSQL, [
        collection.external_identifier,
        collection.title,
        collection.description,
        collection.visibility,
        collection.license,
        collection.opinfi
    ]);
};

const upsertOwner = async(collectionId, owner) => {
    const upsertOwnerSQL = fs.readFileSync(path.resolve(__dirname, "../sql/upsertOwner.sql"), "utf8");
    return await database.query(upsertOwnerSQL, [
        collectionId,
        owner
    ]);
};

const upsertAccessRights = async(collectionId, accessRights) => {
    const upsertAccessRightsSQL = fs.readFileSync(path.resolve(__dirname, "../sql/upsertAccessRights.sql"), "utf8");
    return await database.query(upsertAccessRightsSQL, [
        collectionId,
        accessRights
    ]);
};

const selectedArchivedVideoWithLogId = async(videoId) => {
    try {
        const selectedArchivedVideoWithLogIdSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getArchivedVideo.sql"), "utf8");
        const result = await database.query(selectedArchivedVideoWithLogIdSQL, [videoId]);
        return result?.rows[0]?.video_log_id;
    } catch (error) {
        console.log(`${error}`);
    }
};

const insertIntoArchivedVideoUsers = async(recipient, video) => {
    const insertIntoArchivedVideoUsersSQL = fs.readFileSync(path.resolve(__dirname, "../sql/insertIntoArchivedVideoUsers.sql"), "utf8");
    const newArchivedVideoUsersEntry = await database.query(insertIntoArchivedVideoUsersSQL, [video.videoId, recipient, video.videoLogId, video.archivedDate, new Date()]);
    return newArchivedVideoUsersEntry.rowCount;
};

const insertIntoVideoLogs = async(statusCode, message, videoId, videoName, originalSeriesId, originalSeriesName, archivedSeriesId) => {
    const insertNewVideoLogEntrySQL = fs.readFileSync(path.resolve(__dirname, "../sql/insertIntoVideoLogs.sql"), "utf8");
    const newVideoLogEntry = await database.query(insertNewVideoLogEntrySQL, [statusCode, message, videoId, videoName, originalSeriesId, originalSeriesName, archivedSeriesId]);
    return newVideoLogEntry.rowCount;
};

const updateVideosTableArchivedStatus = async(videoId) => {
    const now = new Date();
    const updateVideoArchivedStatusSQL = fs.readFileSync(path.resolve(__dirname, "../sql/updateVideosTableArchivedStatus.sql"), "utf8");
    const updatedVideoEntry = await database.query(updateVideoArchivedStatusSQL, [now, videoId]);
    return updatedVideoEntry.rowCount;
};

const selectedVideosToBeDeleted = async() => {
    const selectedVideosToBeDeletedSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getSelectedVideosToBeDeleted.sql"), "utf8");
    return await database.query(selectedVideosToBeDeletedSQL);
};

const selectedVideosToBeCleanedUp = async() => {
    const selectedVideosToBeCleanedUpSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getSelectedVideosToBeCleanedUp.sql"), "utf8");
    return await database.query(selectedVideosToBeCleanedUpSQL);
};

const updateVideosTableDeletedStatus = async(videoId) => {
    const now = new Date();
    const updateVideoDeletedStatusSQL = fs.readFileSync(path.resolve(__dirname, "../sql/updateVideosTableDeletedStatus.sql"), "utf8");
    const updatedVideoEntry = await database.query(updateVideoDeletedStatusSQL, [now, videoId]);
    return updatedVideoEntry.rowCount;
};

const updateVideosTableCleanedStatus = async(videoId) => {
    const now = new Date();
    const updateVideoDeletedStatusSQL = fs.readFileSync(path.resolve(__dirname, "../sql/updateVideosTableCleanedStatus.sql"), "utf8");
    const updatedVideoEntry = await database.query(updateVideoDeletedStatusSQL, [now, videoId]);
    return updatedVideoEntry.rowCount;
};

const getArchivedDate = () => {
    let archivedDate = new Date();
    archivedDate.setFullYear(archivedDate.getFullYear() + Constants.DEFAULT_VIDEO_ARCHIVED_YEAR_AMOUNT);
    return archivedDate;
};

const restoreVideoStateToBeArchived = async(videoId) => {
    const archivedDate = getArchivedDate();
    const updateVideoDeletedStatusSQL = fs.readFileSync(path.resolve(__dirname, "../sql/restoreVideoStateToBeArchived.sql"), "utf8");
    const updatedVideoEntry = await database.query(updateVideoDeletedStatusSQL, [null, null, archivedDate, videoId]);
    return updatedVideoEntry.rowCount;
};

const updateVideoErrorDate = async(videoId) => {
    const now = new Date();
    const updateVideoErrorDateSQL = fs.readFileSync(path.resolve(__dirname, "../sql/updateVideosErrorDate.sql"), "utf8");
    const updatedVideoEntry = await database.query(updateVideoErrorDateSQL, [now, videoId]);
    return updatedVideoEntry.rowCount;
};

const removeThumbnailImage = async(videoId) => {
    const getThumbnailImageSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getThumbnailImage.sql"), "utf8");
    const foundThumbnailImage = await database.query(getThumbnailImageSQL, [videoId]);
    if (foundThumbnailImage.rowCount > 0) {
        const removeThumbnailImageSQL = fs.readFileSync(path.resolve(__dirname, "../sql/removeThumbnailImage.sql"), "utf-8");
        await database.query(removeThumbnailImageSQL, [videoId]);
        await insertIntoVideoLogs('200', 'successfully deleted thumbnail', videoId, '', '', '', '');
    }
};

const deleteArchivedVideoUsers = async () => {
    try {
        let date = new Date();
        let dateSixMonthsAgo = subMonths(date, 6);
        let olderThanFourMonths = format(dateSixMonthsAgo, 'yyyy-MM-dd HH:mm:ss');
        const removeArchivedVideoUsersSQL = fs.readFileSync(path.resolve(__dirname, "../sql/removeArchivedVideoUsers.sql"), "utf-8");
        const result = await database.query(removeArchivedVideoUsersSQL, [olderThanFourMonths]);
        console.log("Removed rows count ", result.rowCount);
    } catch (error) {
        throw error;
    }
}

module.exports = {
    selectedVideosWithArchivedDates : selectedVideosWithArchivedDates,
    selectedArchivedVideoWithLogId: selectedArchivedVideoWithLogId,
    insertIntoArchivedVideoUsers: insertIntoArchivedVideoUsers,
    insertIntoVideoLogs : insertIntoVideoLogs,
    updateVideosTableArchivedStatus: updateVideosTableArchivedStatus,
    selectedVideosToBeDeleted: selectedVideosToBeDeleted,
    selectedVideosToBeCleanedUp: selectedVideosToBeCleanedUp,
    updateVideosTableDeletedStatus: updateVideosTableDeletedStatus,
    updateVideosTableCleanedStatus: updateVideosTableCleanedStatus,
    restoreVideoStateToBeArchived: restoreVideoStateToBeArchived,
    updateVideoErrorDate: updateVideoErrorDate,
    removeThumbnailImage : removeThumbnailImage,
    deleteArchivedVideoUsers: deleteArchivedVideoUsers,
    getVideosFromVideosTable: getVideosFromVideosTable,
    upsertMediaItem: upsertMediaItem,
    upsertFlavor: upsertFlavor,
    upsertCollection: upsertCollection,
    upsertOwner: upsertOwner,
    upsertAccessRights: upsertAccessRights
};
