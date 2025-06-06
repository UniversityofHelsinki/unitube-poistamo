const apiService = require('./apiService');
const databaseService = require('./databaseService');
const timer = require('./timer');

const deleteVideos = async(selectedVideosToBeDeleted) => {
    for (const videoForDeletion of selectedVideosToBeDeleted) {
        const videoId = videoForDeletion.video_id;
        console.log("video id to be deleted: " , videoId);
        try {
            const eventResponse = await apiService.getEvent(videoId);
            if (eventResponse.status != '200') {
                await databaseService.insertIntoVideoLogs(eventResponse.status, `error deleting video, no video found for this id`, videoId, null, null, null, null);
                await databaseService.updateVideosTableDeletedStatus(videoId);
                // something went wrong continue to next video
                continue;
            }

            const originalSeriesId = eventResponse.data.is_part_of;
            const videoTitle = eventResponse.data.title;
            const seriesResponse = await apiService.getSeries(originalSeriesId);
            if (seriesResponse.status !== 200) {
                await databaseService.insertIntoVideoLogs(eventResponse.status, `error no series found for video being deleted by id`, videoId, videoTitle, originalSeriesId, null, null);
                await databaseService.updateVideosTableDeletedStatus(videoId);
                // something went wrong no series found for video continue to next video
                continue;
            }

            const archivedSeriesId = process.env.POISTAMO_OPENCAST_ARCHIVED_SERIES;

            // call api service to delete video
            const deletionResponse = await apiService.deleteVideo(eventResponse.data, archivedSeriesId);
            if (deletionResponse.status !== 200) {
                if (deletionResponse.status === 405) {
                    // video was not in archived series so empty videos actual_archived_date and deletion_date and put video's archived_date field to 3 years from now
                    await databaseService.restoreVideoStateToBeArchived(videoId);
                }
                // insert into video_logs table for error in operation
                await databaseService.insertIntoVideoLogs(deletionResponse.status, `error deleting video ${deletionResponse.statusText}`, videoId, null, null, null, null);
                // something went wrong continue to next video
                continue;
            } else {
                // insert into video_logs table for successful operation
                await databaseService.insertIntoVideoLogs(deletionResponse.status, `successfully deleted video`, videoId, null, null, null, null);
                // update videos table actual_archived_date field to current date
                await databaseService.updateVideosTableDeletedStatus(videoId);
                // remove thumbnail image from thumbnails table
                await databaseService.removeThumbnailImage(videoId);
            }
        } catch (error) {
            console.log(error.message);
            // insert into video_logs table for error  logs
            await databaseService.insertIntoVideoLogs(500, error.message, videoId, null, null, null, null);

        }
        await timer.getTimer(60000); // wait for 1 minute before next api call
    }
};

const deleteArchivedVideoUsers = async() => {
    try {
        await databaseService.deleteArchivedVideoUsers();
    } catch (error) {
        console.log("Failed to delete old archived videos ", error);
    }
}

module.exports.deleteVideos = deleteVideos;
module.exports.deleteArchivedVideoUsers = deleteArchivedVideoUsers;
