const apiService = require('./apiService');
const constants = require('../utils/constants');
const databaseService = require('./databaseService');

const getVideoData = async (video) => {
    try {
        const videoId = video.video_id;
        const videoResponse = await apiService.getEvent(videoId);
        return videoResponse.data;
    } catch (error) {
        console.log(`${error} retrieving video data with id  : ${video.video_id}`);
        throw error;
    }
};

const getSeriesData = async (seriesId) => {
    try {
        const seriesData = await apiService.getSeries(seriesId);
        return seriesData.data;
    } catch (error) {
        console.log(`${error} retrieving series data with id  : ${seriesId}`);
        throw error;
    }
};

const getRecipientsDataFromGroup = async (contributor) => {
    try {
        const recipients = await apiService.getRecipientsFromGroup(contributor);
        return recipients.data;
    } catch (error) {
        console.log(`${error} retrieving contributor from group : ${contributor}`);
    }
};

const getRecipientsByGroup = async (contributor, recipients) => {
    //Hakeeko alla oleva rekursiivisesti kaikki (ryhmän voi sisältää ryhmän, jolla on jäseniä)
    let recipientsByGroup = await getRecipientsDataFromGroup(contributor);

    if (recipientsByGroup && recipientsByGroup.members && recipientsByGroup.members.length > 0) {
        for (const recipientByGroup of recipientsByGroup.members) {
            if (recipientByGroup.username) {
                const username = recipientByGroup.username;
                if (!recipients.has(username)) {
                    recipients.set(username, []);
                }
            }
        }
    }
}

const getDirectlyAddedRecipients = async (userNamesAddedDirectly, recipients) => {
    if (userNamesAddedDirectly && userNamesAddedDirectly.length > 0) {
            for (const userName of userNamesAddedDirectly) {
                if (!recipients.has(userName)) {
                    recipients.set(userName, []);
                }
            }
    }
}

const getRecipients = async(series) => {
    let recipients = new Map();
    let userNamesAddedDirectly = [];
    for (const contributor of series.contributors) {
        const match = constants.IAM_GROUP_PREFIXES.filter(entry => contributor.includes(entry));
        if (match && match.length > 0) {
            await getRecipientsByGroup(contributor, recipients);
        } else {
            userNamesAddedDirectly.push(contributor);
        }
    }
    await getDirectlyAddedRecipients(userNamesAddedDirectly, recipients);
    return recipients;
};

const populateRecipientsMap = (recipientsMap, recipientEntry, video) => {
    const payload = [];
    const recipient = recipientEntry[0];
    const payloadObject = {video : {videoId : video.video_id, archivedDate: video.archived_date, videoLogId: video.video_log_id }};
    if (!recipientsMap.has(recipient)) {
        payload.push(payloadObject);
        recipientsMap.set(recipient, payload);
    } else {
        let payload = recipientsMap.get(recipient);
        payload.push(payloadObject);
        recipientsMap[recipient] = payload;
    }
    return recipientsMap;
};

const isTrashSeries = (series) => series.title.toLowerCase().includes(constants.TRASH);

const addVideoLogId = (video, videoLogId) => {
    let videoWithLogId = {...video, 'video_log_id': videoLogId}
    Object.assign(video, videoWithLogId);
}

const getVideoUsers = async (videos) => {
    let recipientsMap = new Map();
    for (const video of videos.rows) {
        try {
            const videoLogId = await databaseService.selectedArchivedVideoWithLogId(video.video_id);
            addVideoLogId(video, videoLogId);
            const videoData = await getVideoData(video);
            const seriesData = await getSeriesData(videoData.is_part_of);
            if (videoData && seriesData) {
                if (!isTrashSeries(seriesData)) {
                    const recipients = await getRecipients(seriesData);
                    for (const recipient of recipients.entries()) {
                        recipientsMap = populateRecipientsMap(recipientsMap, recipient, video);
                    }
                }
            }
        } catch (error) {
            console.log(`${error}`);
            continue;
        }
    }
    return recipientsMap;
};

const storeArchivedVideoUsers = async (videos) => {
    const videoUsers = await getVideoUsers(videos);
    for (const [recipient, payload] of videoUsers.entries()) {
        //console.log(recipient, payload);
        for (const video of payload) {
            await databaseService.insertIntoArchivedVideoUsers(recipient, video.video);
        }
    }
}

module.exports = {
    storeArchivedVideoUsers : storeArchivedVideoUsers,
};

