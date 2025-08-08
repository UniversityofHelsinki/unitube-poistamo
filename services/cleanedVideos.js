const apiService = require("./apiService");
const databaseService = require("./databaseService");
const timer = require("./timer");
const cleanVideos = async (selectedVideosToBeCleaned) => {
    for (const videoForDeletion of selectedVideosToBeCleaned) {
        const videoId = videoForDeletion.video_id;
        console.log("video id to be cleaned: " , videoId);
        try {
            const eventResponse = await apiService.getEvent(videoId);
            if (eventResponse.status !== 200) {
                await databaseService.insertIntoVideoLogs(eventResponse.status, `error cleaning video, no video found for this id`, videoId, null, null, null, null);
                await databaseService.updateVideosTableCleanedStatus(videoId);
                // something went wrong continue to next video
                continue;
            }
            // call api service to clean video
            const cleanedResponse = await apiService.cleanVideo(eventResponse.data);
            if (cleanedResponse.status !== 202) {
                await databaseService.insertIntoVideoLogs(cleanedResponse.status, `error cleaning video`, videoId, null, null, null, null);
                await databaseService.updateVideosTableCleanedStatus(videoId);
                // something went wrong continue to next video
                continue;
            } else {
                // insert into video_logs table for successful operation
                await databaseService.insertIntoVideoLogs(cleanedResponse.status, `successfully cleaned video`, videoId, null, null, null, null);
                await databaseService.updateVideosTableCleanedStatus(videoId);
            }
        } catch (error) {
            console.log(error.message);
            // insert into video_logs table for error logs
            await databaseService.insertIntoVideoLogs(500, error.message, videoId, null, null, null, null);

        }
        await timer.getTimer(60000); // wait for 1 minute before next api call
    }
};
module.exports.cleanVideos = cleanVideos;
