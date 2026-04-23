const constants = require('../utils/constants');

const publicRoleCount = (roles) => {
    return roles.filter(role => role.role === constants.ROLE_ANONYMOUS || role.role === constants.ROLE_KATSOMO).length;
};

module.exports = {
    publicRoleCount
};
