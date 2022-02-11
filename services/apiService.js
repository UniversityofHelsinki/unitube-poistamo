const constants = require('../utils/constants');
const security = require('./security');
const FormData = require('form-data');

exports.getEvent = async (videoId) => {
    try {
        const eventsUrl = constants.OPENCAST_EVENTS_PATH + videoId;
        const response = await security.opencastBase.get(eventsUrl);
        return response;
    } catch (error) {
        throw error;
    }
};

exports.getSeries = async (seriesId) => {
    try {
        const seriesUrl = constants.OPENCAST_SERIES_PATH + seriesId;
        const response = await security.opencastBase.get(seriesUrl);
        return response;
    } catch (error) {
        throw error;
    }
}

const modifyEventMetadataForOpencast = (archivedSeriesId) => {
    const metadataArray = [];
    metadataArray.push(
        {
            'id' : 'isPartOf',
            'value' : archivedSeriesId
        });
    return metadataArray;
};

const checkForEventActiveTransactionStatus= async(event) => {
    // check event transaction status
    const transactionStatusPath = constants.OPENCAST_ADMIN_EVENT_PREFIX + event.identifier + '/hasActiveTransaction';
    const response = await security.opencastBase.get(transactionStatusPath);
    return response;
};

const updateEventMetadata = async(video, archivedSeriesId) => {
    try {
        const videoMetaDataUrl = constants.OPENCAST_EVENTS_PATH + video.identifier + constants.OPENCAST_METADATA_PATH + constants.OPENCAST_TYPE_QUERY_PARAMETER + constants.OPENCAST_TYPE_DUBLINCORE_EPISODE;
        const modifiedEventMetadata = modifyEventMetadataForOpencast(archivedSeriesId);

        // media package url
        const mediaPackageUrl = constants.OPENCAST_ASSETS_EPISODE_URL + video.identifier;

        let bodyFormData = new FormData();
        bodyFormData.append('metadata', JSON.stringify(modifiedEventMetadata));

        let headers = {
            ...bodyFormData.getHeaders(),
            'Content-Length': bodyFormData.getLengthSync()
        };
        // update event metadata
        await security.opencastBase.put(videoMetaDataUrl, bodyFormData, {headers});

        // get media package to republish query
        const mediaPackageResponse = await security.opencastBase.get(mediaPackageUrl);
        return mediaPackageResponse;
    } catch (error) {
        throw error;
    }
};

const republishEventMetadata = async(mediaPackageResponse) => {
    try { // form data for the republish request
        let bodyFormData = new FormData();
        bodyFormData.append('definition', constants.REPUBLISH_METADATA_WORKFLOW_DEFINITION);
        bodyFormData.append('mediapackage', mediaPackageResponse.data);
        bodyFormData.append('properties', constants.PROPERTIES_REPUBLISH_METADATA);

        // headers for the republish request
        let headers = {
            ...bodyFormData.getHeaders(),
            'Content-Length': bodyFormData.getLengthSync()
        };

        // workflow start url
        const republishMetadataUrl = constants.OPENCAST_WORKFLOW_START_PATH;

        // do the republish request
        const response = await security.opencastBase.post(republishMetadataUrl, bodyFormData, {headers});
        return response;
    } catch (error) {
        throw error;
    }
};

const startArchiveDeleteEventWorkFlow = async(mediaPackageResponse) => {
    // form data for the workflow request
    try {
        let bodyFormData = new FormData();
        bodyFormData.append('definition', constants.ARCHIVE_DELETE_WORKFLOW_DEFINITION);
        bodyFormData.append('mediapackage', mediaPackageResponse.data);

        // headers for the republish request
        let headers = {
            ...bodyFormData.getHeaders(),
            'Content-Length': bodyFormData.getLengthSync()
        };

        // workflow start path
        const workFlowPath = constants.OPENCAST_WORKFLOW_START_PATH;

        // start the workflow
        const response = await security.opencastBase.post(workFlowPath, bodyFormData, {headers});
        return response;
    } catch (error) {
        throw error;
    }
}

const isVideoInArchivedSeries = (video, archivedSeriesId) => {
    return video.is_part_of === archivedSeriesId;
};

const hasEventActiveTransaction = (activeTransaction) => {
    return activeTransaction.data && activeTransaction.data.active === true;
};

// Returns a Promise that resolves after "ms" Milliseconds
const timer = ms => new Promise(res => setTimeout(res, ms));

exports.moveVideoToArchivedSeries = async (video, archivedSeriesId) => {
    try {
        if (isVideoInArchivedSeries(video, archivedSeriesId)) {
            return {
                status: 500,
                statusText: 'video already in archived series skipping to next one'
            };
        }
        const activeTransaction = await checkForEventActiveTransactionStatus(video);
        if (hasEventActiveTransaction(activeTransaction)) {
            return {
                status: 403,
                statusText: 'error active transaction in progress'
            };
        }
        const mediaPackageResponse = await updateEventMetadata(video, archivedSeriesId);
        await timer(60000) // wait for 1 minute before republish call
        const response = await republishEventMetadata(mediaPackageResponse);
        return response;
    } catch (error) {
        throw error;
    }
};

exports.deleteVideo = async (video, archivedSeriesId) => {
    try {
        if (!isVideoInArchivedSeries(video, archivedSeriesId)) {
            return {
                status: 500,
                statusText: 'video is not in archived series skipping to next one'
            };
        }

        const activeTransaction = await checkForEventActiveTransactionStatus(video);
        if (hasEventActiveTransaction(activeTransaction)) {
            return {
                status: 403,
                statusText: 'error active transaction in progress'
            };
        }

        // media package url
        const mediaPackageUrl = constants.OPENCAST_ASSETS_EPISODE_URL + video.identifier;
        // get media package for archive-delete workflow
        const mediaPackageResponse = await security.opencastBase.get(mediaPackageUrl);

        // start the archive deletion workflow
        const response = await startArchiveDeleteEventWorkFlow(mediaPackageResponse);
        return response;
    } catch (error) {
        throw error;
    }
};
