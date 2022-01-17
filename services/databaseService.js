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


module.exports = {
    selectedVideosWithArchivedDates : selectedVideosWithArchivedDates,
    insertIntoVideoLogs : insertIntoVideoLogs
};
