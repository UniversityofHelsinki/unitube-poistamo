const fs = require("fs");
const path = require("path");
const database = require("./database");


const selectedVideosWithArchivedDates = async() => {
    const selectedVideosWithArchivedDatesSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getVideosWithArchivedDate.sql"), "utf8");
    const selectedVideos = await database.pool.query(selectedVideosWithArchivedDatesSQL);
    return selectedVideos;
};

const insertIntoVideoLogs = async(statusCode, message, videoId) => {
    const insertNewVideoLogEntrySQL = fs.readFileSync(path.resolve(__dirname, "../sql/insertIntoVideoLogs.sql"), "utf8");
    const newVideoLogEntry = await database.pool.query(insertNewVideoLogEntrySQL, [statusCode, message, videoId]);
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


module.exports = {
    selectedVideosWithArchivedDates : selectedVideosWithArchivedDates,
    insertIntoVideoLogs : insertIntoVideoLogs,
    updateVideosTableArchivedStatus: updateVideosTableArchivedStatus,
    selectedVideosToBeDeleted: selectedVideosToBeDeleted,
    updateVideosTableDeletedStatus: updateVideosTableDeletedStatus
};
