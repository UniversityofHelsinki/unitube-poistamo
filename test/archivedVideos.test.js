const apiService = require('../services/apiService');
const archivedVideos = require('../services/archivedVideos');
const timer = require('../services/timer');
const setupTestDatabase = require('./helpers/database');
const client = require('../services/database');
const format = require('date-format');

setupTestDatabase();

beforeEach(async () => {
    await client.query('INSERT INTO videos (video_id, archived_date, video_creation_date) VALUES (\'e8a86433-0245-44b8-b0d7-69f6578bac6f\', \'2018-01-01\'::date, \'2008-01-01\'::date)');
    await timer.getTimer.mockResolvedValue(0);
});

afterAll(async () => {
    jest.clearAllMocks();
});

jest.mock('../services/apiService');
jest.mock('../services/timer');

const videosToArchive = [{video_id: 'e8a86433-0245-44b8-b0d7-69f6578bac6f'}];
const today = format.asString('dd.MM.yyyy', new Date());

const insertMediaItemReferences = async() => {
    const collection = await client.query("INSERT INTO collection (external_identifier, title, description, visibility, license) VALUES ('collection', 'Collection', 'Collection description', 'public', 'CC BY') RETURNING id");
    const mediaItem = await client.query("INSERT INTO media_item (external_identifier, name, description, collection_external_id, collection_id) VALUES ('e8a86433-0245-44b8-b0d7-69f6578bac6f', 'Video', 'Video description', 'collection', $1) RETURNING id", [collection.rows[0].id]);
    const mediaItemId = mediaItem.rows[0].id;
    await client.query('INSERT INTO flavor (media_item_id, mimetype, type, url) VALUES ($1, \'video/mp4\', \'presenter\', \'https://example.com/video.mp4\')', [mediaItemId]);
    await client.query('INSERT INTO chapters (media_item_id, language, vtt_content) VALUES ($1, \'en\', \'WEBVTT\')', [mediaItemId]);
    await client.query('INSERT INTO mediaitem_transcriptions (media_item_id, language, title) VALUES ($1, \'en\', \'English\')', [mediaItemId]);
    await client.query('INSERT INTO license (name, media_item_id) VALUES (\'CC BY\', $1)', [mediaItemId]);
    const keyword = await client.query("INSERT INTO keyword (label) VALUES ('test') RETURNING id");
    await client.query('INSERT INTO mediaitem_keyword (mediaitem, keyword, media_item_id) VALUES ($1, $2, $3)', ['e8a86433-0245-44b8-b0d7-69f6578bac6f', keyword.rows[0].id, mediaItemId]);
};

describe('Video archiving tests', () => {

    it('archives a video which is not in archived series', async () => {

        await insertMediaItemReferences();

        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                identifier: 'e8a86433-0245-44b8-b0d7-69f6578bac6f',
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'pienivideo.mp4',
            }
        });
        apiService.getSeries.mockResolvedValue({
            status: 200,
            data: {
                identifier: '379fb94c-f194-422a-be6e-fc24f9507b95',
                title: 'joku sarja',
            }
        });
        apiService.moveVideoToArchivedSeries.mockResolvedValue({
            status: 200,
            statusText: 'OK'
        });

        let videos = await client.query('SELECT * FROM videos');
        expect(videos.rows[0].actual_archive_date).toBeUndefined();
        let video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toEqual([]);

        await archivedVideos.archiveVideos(videosToArchive);

        video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].oc_messages).toEqual('successfully archived video');
        expect(video_logs.rows[0].archived_series_id).toEqual(process.env.POISTAMO_OPENCAST_ARCHIVED_SERIES);
        expect(video_logs.rows[1].oc_messages).toEqual('successfully deleted media item');

        videos = await client.query('SELECT video_id, error_date, to_char(actual_archived_date, \'DD.MM.YYYY\') as actual_archived_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].actual_archived_date).not.toBeNull();
        expect(videos.rows[0].actual_archived_date).toEqual(today);
        expect(videos.rows[0].error_date).toBeNull();

        expect((await client.query('SELECT * FROM media_item')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM flavor')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM chapters')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM mediaitem_transcriptions')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM license')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM MEDIAITEM_KEYWORD')).rows).toEqual([]);
    });


    it('marks a video deleted if it\'s not found from opencast', async () => {

        await insertMediaItemReferences();
        apiService.getEvent.mockResolvedValue({
            status: 404
        });

        await archivedVideos.archiveVideos(videosToArchive);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].oc_messages).toEqual('error archiving video, no video found for this id');
        expect(video_logs.rows[0].archived_series_id).toBeNull();
        expect(video_logs.rows[1].oc_messages).toEqual('successfully deleted media item');

        let videos = await client.query('SELECT video_id, to_char(actual_archived_date, \'DD.MM.YYYY\') as actual_archived_date, error_date, to_char(deletion_date, \'DD.MM.YYYY\') as deletion_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].actual_archived_date).toEqual(today);
        expect(videos.rows[0].deletion_date).toEqual(today);
        expect(videos.rows[0].error_date).toBeNull();
        expect((await client.query('SELECT * FROM media_item')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM flavor')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM chapters')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM mediaitem_transcriptions')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM license')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM MEDIAITEM_KEYWORD')).rows).toEqual([]);
    });


    it('doesnt archive a video if series is not found', async () => {

        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'pienivideo.mp4',
            }
        });
        apiService.getSeries.mockResolvedValue({
            status: 400
        });

        await archivedVideos.archiveVideos(videosToArchive);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].oc_messages).toEqual('error no series found for series id');
        expect(video_logs.rows[0].archived_series_id).toBeNull();

        const videos = await client.query('SELECT * FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].actual_archived_date).toBeNull();
        expect(videos.rows[0].deletion_date).toBeNull();
        expect(videos.rows[0].error_date).toBeNull();
    });


    it('doesnt archive a video which is already in archived series', async () => {

        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'pienivideo.mp4',
            }
        });
        apiService.getSeries.mockResolvedValue({
            status: 200,
            data: {
                identifier: '379fb94c-f194-422a-be6e-fc24f9507b95',
                title: 'joku sarja',
            }
        });

        apiService.moveVideoToArchivedSeries.mockResolvedValue({
            status: 405,
            statusText: 'video already in archived series skipping to next one'
        });

        await archivedVideos.archiveVideos(videosToArchive);

        const videos = await client.query('SELECT video_id, deletion_date, error_date, to_char(actual_archived_date, \'DD.MM.YYYY\') as actual_archived_date FROM videos');
        expect(videos.rows[0].actual_archived_date).toEqual(today);
        expect(videos.rows[0].deletion_date).toBeNull();
        expect(videos.rows[0].error_date).toBeNull();

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows[0].oc_messages).toEqual('error archiving video: video already in archived series skipping to next one');
        expect(video_logs.rows[0].archived_series_id).toEqual(process.env.POISTAMO_OPENCAST_ARCHIVED_SERIES);
    });

    it('error in opencast archiving', async () => {
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'pienivideo.mp4',
            }
        });
        apiService.moveVideoToArchivedSeries.mockResolvedValue({
            status: 500,
            statusText: 'opencast error'
        });

        await archivedVideos.archiveVideos(videosToArchive);

        const videos = await client.query('SELECT actual_archived_date, deletion_date, to_char(error_date, \'DD.MM.YYYY\') as error_date FROM videos');
        expect(videos.rows[0].actual_archived_date).toBeNull();
        expect(videos.rows[0].deletion_date).toBeNull();
        expect(videos.rows[0].error_date).toEqual(today);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].oc_messages).toEqual('error archiving video: opencast error');
        expect(video_logs.rows[1].oc_messages).toEqual('no media item found for removal');
    });

    it('logs and cleans up when Opencast event lookup fails', async () => {
        await insertMediaItemReferences();
        apiService.getEvent.mockRejectedValue(new Error('opencast unavailable'));

        await archivedVideos.archiveVideos(videosToArchive);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].status_code).toEqual('500');
        expect(video_logs.rows[0].oc_messages).toEqual('opencast unavailable');
        expect(video_logs.rows[1].oc_messages).toEqual('successfully deleted media item');
        expect((await client.query('SELECT * FROM media_item')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM flavor')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM chapters')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM mediaitem_transcriptions')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM license')).rows).toEqual([]);
        expect((await client.query('SELECT * FROM MEDIAITEM_KEYWORD')).rows).toEqual([]);
    });

    it('logs when Opencast series lookup fails', async () => {
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'pienivideo.mp4'
            }
        });
        apiService.getSeries.mockRejectedValue(new Error('series service unavailable'));

        await archivedVideos.archiveVideos(videosToArchive);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].status_code).toEqual('500');
        expect(video_logs.rows[0].oc_messages).toEqual('series service unavailable');
        expect(video_logs.rows[1].oc_messages).toEqual('no media item found for removal');
    });

    it('logs when moving a video to the archived series fails', async () => {
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'pienivideo.mp4'
            }
        });
        apiService.getSeries.mockResolvedValue({
            status: 200,
            data: {title: 'joku sarja'}
        });
        apiService.moveVideoToArchivedSeries.mockRejectedValue(new Error('archive service unavailable'));

        await archivedVideos.archiveVideos(videosToArchive);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].status_code).toEqual('500');
        expect(video_logs.rows[0].oc_messages).toEqual('archive service unavailable');
        expect(video_logs.rows[1].oc_messages).toEqual('no media item found for removal');
    });

});



