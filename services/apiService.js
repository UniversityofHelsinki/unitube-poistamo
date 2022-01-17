const constants = require('../utils/constants');
const security = require('./security');
const FormData = require('form-data');

exports.getEvent = async (videoId) => {
    const eventsUrl = constants.OPENCAST_EVENTS_PATH + videoId;
    const response = await security.opencastBase(eventsUrl);
    return response.data;
};

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

        // republish metadata url
        const republishMetadataUrl = constants.OPENCAST_WORKFLOW_START_PATH;

        // do the republish request
        const response = await security.opencastBase.post(republishMetadataUrl, bodyFormData, {headers});
        return response;
    } catch (error) {
        throw error;
    }
}

exports.moveVideoToArchivedSeries = async (video, archivedSeriesId) => {
    try {
        const isVideoAlreadyInArchivedSeries = video.is_part_of === archivedSeriesId;
        if (isVideoAlreadyInArchivedSeries) {

        } else {
            const activeTransaction = await checkForEventActiveTransactionStatus(video);
            if (activeTransaction.data && activeTransaction.data.active === false) {
                const mediaPackageResponse = await updateEventMetadata(video, archivedSeriesId);
                const response = await republishEventMetadata(mediaPackageResponse);
                return response;
            } else {
                return {
                    status: 403,
                    statusText: 'error active transaction in progress'
                };
            }
        }
    } catch (error) {
        throw error;
    }
};
