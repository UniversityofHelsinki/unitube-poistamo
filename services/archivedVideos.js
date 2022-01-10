
// Returns a Promise that resolves after "ms" Milliseconds
const timer = ms => new Promise(res => setTimeout(res, ms));

const archiveVideos = async(archivedVideos) => {
    console.log("archived videos: "+ archivedVideos);

    for (let i = 0; i < archivedVideos.length; i++) {
        console.log(archivedVideos[i].archived_date);
        await timer(10000); // wait for 10 seconds before next api call
        // call api service to archive video in opencast
        // update video_logs table for current video archived status
        // update videos table actual_archived_date field to current date
    }
};


module.exports.archiveVideos = archiveVideos;
