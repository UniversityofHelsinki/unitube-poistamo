const fs = require("fs");
const path = require("path");
const database = require("./database");
const Constants = require('../utils/constants');


const selectedVideosWithArchivedDates = async() => {
    const selectedVideosWithArchivedDatesSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getSelectedVideosToBeArchived.sql"), "utf8");
    const selectedVideos = await database.pool.query(selectedVideosWithArchivedDatesSQL);
    return selectedVideos;
};

const insertIntoVideoLogs = async(statusCode, message, videoId, videoName, originalSeriesId, originalSeriesName, archivedSeriesId) => {
    const insertNewVideoLogEntrySQL = fs.readFileSync(path.resolve(__dirname, "../sql/insertIntoVideoLogs.sql"), "utf8");
    const newVideoLogEntry = await database.pool.query(insertNewVideoLogEntrySQL, [statusCode, message, videoId, videoName, originalSeriesId, originalSeriesName, archivedSeriesId]);
    return newVideoLogEntry.rowCount;
};

const updateVideosTableArchivedStatus = async(videoId) => {
    const now = new Date();
    const updateVideoArchivedStatusSQL = fs.readFileSync(path.resolve(__dirname, "../sql/updateVideosTableArchivedStatus.sql"), "utf8");
    const updatedVideoEntry = await database.pool.query(updateVideoArchivedStatusSQL, [now, videoId]);
    return updatedVideoEntry.rowCount;
};

const selectedVideosToBeDeleted = async() => {
    const selectedVideosToBeDeletedSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getSelectedVideosToBeDeleted.sql"), "utf8");
    const selectedVideos = await database.pool.query(selectedVideosToBeDeletedSQL);
    return selectedVideos;
};

const updateVideosTableDeletedStatus = async(videoId) => {
    const now = new Date();
    const updateVideoDeletedStatusSQL = fs.readFileSync(path.resolve(__dirname, "../sql/updateVideosTableDeletedStatus.sql"), "utf8");
    const updatedVideoEntry = await database.pool.query(updateVideoDeletedStatusSQL, [now, videoId]);
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
    const updatedVideoEntry = await database.pool.query(updateVideoDeletedStatusSQL, [null, null, archivedDate, videoId]);
    return updatedVideoEntry.rowCount;
};

module.exports = {
    selectedVideosWithArchivedDates : selectedVideosWithArchivedDates,
    insertIntoVideoLogs : insertIntoVideoLogs,
    updateVideosTableArchivedStatus: updateVideosTableArchivedStatus,
    selectedVideosToBeDeleted: selectedVideosToBeDeleted,
    updateVideosTableDeletedStatus: updateVideosTableDeletedStatus,
    restoreVideoStateToBeArchived: restoreVideoStateToBeArchived
};
