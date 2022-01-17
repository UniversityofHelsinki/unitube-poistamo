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

const updateEventMetadata = async(video, archivedSeriesId) => {
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
};

const republishEventMetadata = async(mediaPackageResponse) => {
    // form data for the republish request
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
    await security.opencastBase.post(republishMetadataUrl, bodyFormData, {headers});
}

exports.moveVideoToArchivedSeries = async (video, archivedSeriesId) => {
    try {
        const mediaPackageResponse = await updateEventMetadata(video, archivedSeriesId);
        await republishEventMetadata(mediaPackageResponse);
    } catch (error) {
        throw error;
    }
};
