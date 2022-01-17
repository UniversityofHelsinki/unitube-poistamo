const fs = require("fs");
const path = require("path");
const database = require("./database");


const selectedVideosWithArchivedDates = async() => {
    const selectedVideosWithArchivedDatesSQL = fs.readFileSync(path.resolve(__dirname, "../sql/getVideosWithArchivedDate.sql"), "utf8");
    const selectedVideos = await database.pool.query(selectedVideosWithArchivedDatesSQL);
    return selectedVideos;
};


module.exports = {
    selectedVideosWithArchivedDates : selectedVideosWithArchivedDates
};
