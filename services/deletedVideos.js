const apiService = require('./apiService');
const databaseService = require('./databaseService');

// Returns a Promise that resolves after "ms" Milliseconds
const timer = ms => new Promise(res => setTimeout(res, ms));

const deleteVideos = async(selectedVideosToBeDeleted) => {
    for (const videoForDeletion of selectedVideosToBeDeleted) {
        const videoId = videoForDeletion.video_id;
        console.log("video id to be deleted: " , videoId);
        try {
            const eventResponse = await apiService.getEvent(videoId);
            if (eventResponse.status != '200') {
                await databaseService.insertIntoVideoLogs(eventResponse.status, `error deleting video, no video found for this id`, videoId, null, null, null, null);
                // something went wrong continue to next video
                continue;
            }

            // call api service to delete video
            const deletionResponse = await apiService.deleteVideo(eventResponse.data);
            if (deletionResponse.status != '200') {
                // insert into video_logs table for error in operation
                await databaseService.insertIntoVideoLogs(deletionResponse.status, `error deleting video ${deletionResponse.statusText}`, videoId, null, null, null, null);
                // something went wrong continue to next video
                continue;
            } else {
                // insert into video_logs table for successful operation
                await databaseService.insertIntoVideoLogs(deletionResponse.status, `successfully deleted video`, videoId, null, null, null, null);
                // update videos table actual_archived_date field to current date
                await databaseService.updateVideosTableDeletedStatus(videoId);
            }
        } catch (error) {
            // insert into video_logs table for error  logs
            await databaseService.insertIntoVideoLogs(500, error.message, videoId, null, null, null, null);

        }
        await timer(60000); // wait for 1 minute before next api call
    }
};


module.exports.deleteVideos = deleteVideos;
