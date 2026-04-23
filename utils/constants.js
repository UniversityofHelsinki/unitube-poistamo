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
const OPENCAST_ACL_PATH = '/acl';
const OCAST_EVENT_MEDIA_PATH_PREFIX = '/admin-ng/event/';
const OCAST_EVENT_MEDIA_PATH_SUFFIX = '/asset/media/media.json';
const OCAST_EVENT_MEDIA_FILE_METADATA = '/asset/media/';

// properties object for the republish query
// Opencast instantiates a java.util.Properties from the value, so key=value pairs and \n as a delimeter.
// https://docs.oracle.com/javase/7/docs/api/java/util/Properties.html#load(java.io.InputStream)
const PROPERTIES_REPUBLISH_METADATA =
    'publishLive=false\nuploadedSearchPreview=true\npublishToOaiPmh=false\ncomment=false\npublishToMediaModule=true';

const DEFAULT_VIDEO_ARCHIVED_YEAR_AMOUNT = 3;

const ROLE_USER_UNLISTED = 'ROLE_USER_UNLISTED';
const ROLE_ANONYMOUS = 'ROLE_ANONYMOUS';
const ROLE_KATSOMO = 'ROLE_KATSOMO';

const STATUS_UNLISTED = 'unlisted';
const STATUS_PUBLISHED = 'published';
const STATUS_PRIVATE = 'private';
const STATUS_MOODLE = 'moodle';

const MOODLE_ACL_INSTRUCTOR = 'instructor';
const MOODLE_ACL_LEARNER = 'learner';

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
    DEFAULT_VIDEO_ARCHIVED_YEAR_AMOUNT,
    OPENCAST_ACL_PATH,
    OCAST_EVENT_MEDIA_PATH_PREFIX,
    OCAST_EVENT_MEDIA_PATH_SUFFIX,
    OCAST_EVENT_MEDIA_FILE_METADATA,
    ROLE_USER_UNLISTED,
    ROLE_ANONYMOUS,
    ROLE_KATSOMO,
    STATUS_UNLISTED,
    STATUS_PUBLISHED,
    STATUS_PRIVATE,
    STATUS_MOODLE,
    MOODLE_ACL_INSTRUCTOR,
    MOODLE_ACL_LEARNER
}
