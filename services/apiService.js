const constants = require('../utils/constants');
const security = require('./security');

exports.getEvent = async (videoId) => {
    const eventsUrl = constants.OPENCAST_EVENTS_PATH + videoId;
    const response = await security.opencastBase(eventsUrl);
    return response.data;
};

exports.moveVideoToArchivedSeries = async (video) => {

};
