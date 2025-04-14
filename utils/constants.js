const ARCHIVED_SERIES = process.env.POISTAMO_ARCHIVED_SERIES;
const REPUBLISH_METADATA_WORKFLOW_DEFINITION = 'republish-metadata';
const ARCHIVE_DELETE_WORKFLOW_DEFINITION = 'archive-delete';

const OPENCAST_EVENTS_PATH = '/api/events/';
const OPENCAST_SERIES_PATH = '/api/series/';
const OPENCAST_METADATA_PATH = '/metadata';
const OPENCAST_TYPE_QUERY_PARAMETER = '?type=';
const OPENCAST_TYPE_DUBLINCORE_EPISODE = 'dublincore/episode';
const OPENCAST_WORKFLOW_START_PATH = '/workflow/start';
const OPENCAST_ASSETS_EPISODE_URL = '/assets/episode/';
const OPENCAST_ADMIN_EVENT_PREFIX = '/admin-ng/event/';
const IAM_GROUP_PREFIXES = ['grp-', 'hy-', 'sys-'];
const IAM_GROUPS_PATH_PREFIX = '/iam/groups/group/';
const IAM_GROUPS_PATH_POSTFIX = '/members';
const IAM_ACCOUNT_EMAIL = '/iam/groups/account/emails';
const TRASH = 'trash';

// properties object for the republish query
// Opencast instantiates a java.util.Properties from the value, so key=value pairs and \n as a delimeter.
// https://docs.oracle.com/javase/7/docs/api/java/util/Properties.html#load(java.io.InputStream)
const PROPERTIES_REPUBLISH_METADATA =
    'publishLive=false\nuploadedSearchPreview=true\npublishToOaiPmh=false\ncomment=false\npublishToMediaModule=true';

const DEFAULT_VIDEO_ARCHIVED_YEAR_AMOUNT = 3;

module.exports = {
    ARCHIVED_SERIES,
    OPENCAST_EVENTS_PATH,
    OPENCAST_SERIES_PATH,
    OPENCAST_METADATA_PATH,
    OPENCAST_TYPE_QUERY_PARAMETER,
    OPENCAST_TYPE_DUBLINCORE_EPISODE,
    OPENCAST_WORKFLOW_START_PATH,
    OPENCAST_ASSETS_EPISODE_URL,
    PROPERTIES_REPUBLISH_METADATA,
    REPUBLISH_METADATA_WORKFLOW_DEFINITION,
    OPENCAST_ADMIN_EVENT_PREFIX,
    IAM_GROUP_PREFIXES,
    IAM_GROUPS_PATH_PREFIX,
    IAM_GROUPS_PATH_POSTFIX,
    IAM_ACCOUNT_EMAIL,
    TRASH,
    ARCHIVE_DELETE_WORKFLOW_DEFINITION,
    DEFAULT_VIDEO_ARCHIVED_YEAR_AMOUNT
}
