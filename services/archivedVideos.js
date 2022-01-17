const apiService = require('./apiService');
const eventService = require('./eventService');

// Returns a Promise that resolves after "ms" Milliseconds
const timer = ms => new Promise(res => setTimeout(res, ms));

const archiveVideos = async(archivedVideos) => {
    console.log("archived videos: "+ archivedVideos);

    for (let i = 0; i < archivedVideos.length; i++) {
        const videoId = archivedVideos[i].video_id;
        await timer(10000); // wait for 10 seconds before next api call
        const event = await apiService.getEvent(videoId);
        const archivedSeriesId = process.env.POISTAMO_ARCHIVED_SERIES;
        try {
            // call api service to move video to archived series
            await apiService.moveVideoToArchivedSeries(event, archivedSeriesId);
        } catch (error) {
            // update video_logs table for error logs and return
        }
        // call api service to archive video in opencast
        // update video_logs table for current video archived status
        // update videos table actual_archived_date field to current date
    }
};


module.exports.archiveVideos = archiveVideos;
