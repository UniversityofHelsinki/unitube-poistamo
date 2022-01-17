const apiService = require('./apiService');
const databaseService = require('./databaseService');
const {response} = require("express");

// Returns a Promise that resolves after "ms" Milliseconds
const timer = ms => new Promise(res => setTimeout(res, ms));

const archiveVideos = async(archivedVideos) => {
    for (let i = 0; i < archivedVideos.length; i++) {
        const videoId = archivedVideos[i].video_id;
        console.log(videoId);
        await timer(10000); // wait for 10 seconds before next api call
        try {
            const event = await apiService.getEvent(videoId);
            const archivedSeriesId = process.env.POISTAMO_ARCHIVED_SERIES;
            // call api service to move video to archived series
            const archiveResponse = await apiService.moveVideoToArchivedSeries(event, archivedSeriesId);
            if (archiveResponse.status != '200') {
                // insert into video_logs table for error in operation
                await databaseService.insertIntoVideoLogs(archiveResponse.status, `error moving from series : ${event.is_part_of} to archived series : ${archivedSeriesId} ${archiveResponse.statusText}`, videoId );
            } else {
                // insert into video_logs table for successful operation
                await databaseService.insertIntoVideoLogs(archiveResponse.status, `moved from series : ${event.is_part_of} to archived series : ${archivedSeriesId}`, videoId );
            }
            // call api service to archive video in opencast
            // update video_logs table for current video archived status
            // update videos table actual_archived_date field to current date
        } catch (error) {
            // insert into video_logs table for error  logs
            await databaseService.insertIntoVideoLogs(500, error.message, videoId);

        }
    }
};


module.exports.archiveVideos = archiveVideos;
