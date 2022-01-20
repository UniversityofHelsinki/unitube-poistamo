const apiService = require('./apiService');
const databaseService = require('./databaseService');

// Returns a Promise that resolves after "ms" Milliseconds
const timer = ms => new Promise(res => setTimeout(res, ms));

const archiveVideos = async(archivedVideos) => {
    for (const archivedVideo of archivedVideos) {
        const videoId = archivedVideo.video_id;
        console.log("video id to be archived: ", videoId);
        try {
            const eventResponse = await apiService.getEvent(videoId);
            if (eventResponse.status != '200') {
                await databaseService.insertIntoVideoLogs(eventResponse.status, `error no video found for this id`, videoId );
                // something went wrong continue to next video
                continue;
            }
            const archivedSeriesId = process.env.POISTAMO_ARCHIVED_SERIES;
            // call api service to move video to archived series
            const archiveResponse = await apiService.moveVideoToArchivedSeries(eventResponse.data, archivedSeriesId);
            if (archiveResponse.status != '200') {
                // insert into video_logs table for error in operation
                await databaseService.insertIntoVideoLogs(archiveResponse.status, `error moving from series : ${eventResponse.data.is_part_of} to archived series : ${archivedSeriesId} ${archiveResponse.statusText}`, videoId );
                // something went wrong continue to next video
                continue;
            } else {
                // insert into video_logs table for successful operation
                await databaseService.insertIntoVideoLogs(archiveResponse.status, `moved from series : ${eventResponse.data.is_part_of} to archived series : ${archivedSeriesId}`, videoId );
                // update videos table actual_archived_date field to current date
                await databaseService.updateVideosTableArchivedStatus(videoId);
            }
        } catch (error) {
            // insert into video_logs table for error  logs
            await databaseService.insertIntoVideoLogs(500, error.message, videoId);

        }
        await timer(60000); // wait for 1 minute before next api call
    }
};


module.exports.archiveVideos = archiveVideos;
