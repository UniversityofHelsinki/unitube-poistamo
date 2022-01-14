const ARCHIVED_SERIES = process.env.POISTAMO_ARCHIVED_SERIES;

const EVENT_METADATA = [
    {
        "flavor": "dublincore/episode",
        "title": "EVENTS.EVENTS.DETAILS.CATALOG.EPISODE",
        "fields": [
            {
                "translatable": false,
                "readOnly": false,
                "id": "isPartOf",
                "label": "EVENTS.EVENTS.DETAILS.METADATA.SERIES",
                "type": "text",
                "value": "",
                "required": false,
                "tabindex": 8
            }
        ]
    }
];

const OPENCAST_EVENTS_PATH = '/api/events/';

module.exports = {
    ARCHIVED_SERIES,
    EVENT_METADATA,
    OPENCAST_EVENTS_PATH
}
