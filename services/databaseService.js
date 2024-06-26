const fs = require("fs");
const path = require("path");
const database = require("./database");
const Constants = require('../utils/constants');

const selectedVideosWithArchivedDates = async() => {
    const selectedVideosWithArchivedDatesSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getSelectedVideosToBeArchived.sql"), "utf8");
    const selectedVideos = await database.query(selectedVideosWithArchivedDatesSQL);
    return selectedVideos;
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
    const selectedVideos = await database.query(selectedVideosToBeDeletedSQL);
    return selectedVideos;
};

const updateVideosTableDeletedStatus = async(videoId) => {
    const now = new Date();
    const updateVideoDeletedStatusSQL = fs.readFileSync(path.resolve(__dirname, "../sql/updateVideosTableDeletedStatus.sql"), "utf8");
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

module.exports = {
    selectedVideosWithArchivedDates : selectedVideosWithArchivedDates,
    insertIntoVideoLogs : insertIntoVideoLogs,
    updateVideosTableArchivedStatus: updateVideosTableArchivedStatus,
    selectedVideosToBeDeleted: selectedVideosToBeDeleted,
    updateVideosTableDeletedStatus: updateVideosTableDeletedStatus,
    restoreVideoStateToBeArchived: restoreVideoStateToBeArchived,
    updateVideoErrorDate: updateVideoErrorDate,
    removeThumbnailImage : removeThumbnailImage
};
