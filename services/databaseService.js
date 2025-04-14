const fs = require("fs");
const path = require("path");
const database = require("./database");
const Constants = require('../utils/constants');
const { subMonths, format } = require('date-fns');

const selectedVideosWithArchivedDates = async() => {
    const selectedVideosWithArchivedDatesSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getSelectedVideosToBeArchived.sql"), "utf8");
    return await database.query(selectedVideosWithArchivedDatesSQL);
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

const deleteArchivedVideoUsers = async () => {
    try {
        let date = new Date();
        let dateFourMonthsAgo = subMonths(date, 4);
        let olderThanFourMonths = format(dateFourMonthsAgo, 'yyyy-MM-dd HH:mm:ss');
        //console.log('olderThanFourMonths:' + olderThanFourMonths);
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
    updateVideosTableDeletedStatus: updateVideosTableDeletedStatus,
    restoreVideoStateToBeArchived: restoreVideoStateToBeArchived,
    updateVideoErrorDate: updateVideoErrorDate,
    removeThumbnailImage : removeThumbnailImage,
    deleteArchivedVideoUsers: deleteArchivedVideoUsers
};
