const constants = require('../utils/constants');

const publicRoleCount = (roles) => {
    return roles.filter(role => role.role === constants.ROLE_ANONYMOUS || role.role === constants.ROLE_KATSOMO).length;
};

const formatDuration = (ms) => {
    if (ms === undefined || ms === null || isNaN(ms)) {
        return '00:00:00';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].join(':');
};

module.exports = {
    publicRoleCount,
    formatDuration
};
