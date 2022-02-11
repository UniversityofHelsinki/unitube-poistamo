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
            if (eventResponse.status !== 200) {
                // statusCode, message, videoId, videoName, originalSeriesName, archivedSeriesId
                await databaseService.insertIntoVideoLogs(eventResponse.status, `error archiving video, no video found for this id`, videoId , null, null, null, null);
                await databaseService.updateVideosTableArchivedStatus(videoId);
                await databaseService.updateVideosTableDeletedStatus(videoId);
                // something went wrong continue to next video
                continue;
            }
            const originalSeriesId = eventResponse.data.is_part_of;
            const videoTitle = eventResponse.data.title;
            const seriesResponse = await apiService.getSeries(originalSeriesId);
            if (seriesResponse.status !== 200) {
                await databaseService.insertIntoVideoLogs(eventResponse.status, `error no series found for series id`, videoId, videoTitle, originalSeriesId, null, null);
                // something went wrong no series found for video continue to next video
                continue;
            }
            const originalSeriesName = seriesResponse.data.title;
            const archivedSeriesId = process.env.POISTAMO_OPENCAST_ARCHIVED_SERIES;

            // call api service to move video to archived series
            const archiveResponse = await apiService.moveVideoToArchivedSeries(eventResponse.data, archivedSeriesId);
            if (archiveResponse.status !== 200) {
                if (archiveResponse.status === 500) {
                    // video was already in archived series so update videos actual_archived_date
                    await databaseService.updateVideosTableArchivedStatus(videoId);
                }
                // insert into video_logs table for error in operation
                await databaseService.insertIntoVideoLogs(archiveResponse.status, `error archiving video: ${archiveResponse.statusText}`, videoId,  videoTitle, originalSeriesId, originalSeriesName, archivedSeriesId );
                // something went wrong continue to next video
                continue;
            } else {
                // insert into video_logs table for successful operation
                await databaseService.insertIntoVideoLogs(archiveResponse.status, `successfully archived video`, videoId, videoTitle, originalSeriesId, originalSeriesName, archivedSeriesId );
                // update videos table actual_archived_date field to current date
                await databaseService.updateVideosTableArchivedStatus(videoId);
            }
        } catch (error) {
            // insert into video_logs table for error  logs
            await databaseService.insertIntoVideoLogs(500, error.message, videoId, null, null, null, null);

        }
        await timer(60000); // wait for 1 minute before next api call
    }
};


module.exports.archiveVideos = archiveVideos;
