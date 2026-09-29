const apiService = require('../services/apiService');
const archivedVideos = require('../services/archivedVideos');
const timer = require('../services/timer');
const path = require("path");
require('dotenv').config({path: path.resolve(__dirname, '../.env')});
const client = require('../services/database');
const Pool = require('pg-pool');
const format = require('date-format');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

beforeAll(async () => {
    const pool = new Pool({
        user: process.env.POSTGRES_USER,
        host: process.env.HOST,
        database: process.env.DATABASE,
        password: process.env.PASSWORD,
        port: process.env.PORT,
        ssl: process.env.SSL ? true : false,
        max: 1, // Reuse the connection to make sure we always hit the same temporal schema
        idleTimeoutMillis: 0 // Disable auto-disconnection of idle clients to make sure we always hit the same temporal schema
    });

    client.end = () => {
        return pool.end();
    };

    client.query = (text, values) => {
        return pool.query(text, values);
    };
});

beforeEach(async () => {
    await client.query('CREATE TEMPORARY TABLE video_logs(video_log_id SERIAL NOT NULL, status_code VARCHAR(255) NOT NULL, oc_messages VARCHAR(255) NOT NULL, video_id VARCHAR(255) NOT NULL, video_name VARCHAR(255), original_series_id VARCHAR(255), original_series_name VARCHAR(255), archived_series_id varchar(255), PRIMARY KEY(video_log_id))');
    await client.query('CREATE TEMPORARY TABLE videos(video_id VARCHAR(255) NOT NULL, archived_date date, actual_archived_date date, deletion_date date, video_creation_date date, error_date date, PRIMARY KEY(video_id))');
    await client.query('CREATE TEMPORARY TABLE mediaItem(id SERIAL PRIMARY KEY, external_identifier VARCHAR(255) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, description VARCHAR(3000) NOT NULL, collection_id VARCHAR(255) NOT NULL)');
    await client.query('CREATE TEMPORARY TABLE flavor(id SERIAL PRIMARY KEY, media_item_id INTEGER NOT NULL, mimetype VARCHAR(255) NOT NULL, type VARCHAR(255) NOT NULL, url TEXT NOT NULL)');
    await client.query('CREATE TEMPORARY TABLE chapters(id SERIAL PRIMARY KEY, media_item_id INTEGER NOT NULL, language VARCHAR(10) NOT NULL, vtt_content TEXT NOT NULL)');
    await client.query('CREATE TEMPORARY TABLE mediaitem_transcriptions(id SERIAL PRIMARY KEY, media_item_id INTEGER NOT NULL, title VARCHAR(255), language VARCHAR(255) NOT NULL)');
    await client.query('CREATE TEMPORARY TABLE license(id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, media_item_id INTEGER)');
    await client.query('CREATE TEMPORARY TABLE MEDIAITEM_KEYWORD(MEDIAITEM VARCHAR(255), KEYWORD BIGINT)');
    await wait(100);
    await client.query('INSERT INTO videos (video_id, archived_date, video_creation_date) VALUES (\'e8a86433-0245-44b8-b0d7-69f6578bac6f\', \'2018-01-01\'::date, \'2008-01-01\'::date)');
    await timer.getTimer.mockResolvedValue(0);
});

afterEach(async () => {
    await wait(100);
    await client.query('DROP TABLE IF EXISTS pg_temp.videos');
    await client.query('DROP TABLE IF EXISTS pg_temp.video_logs');
    await client.query('DROP TABLE IF EXISTS pg_temp.MEDIAITEM_KEYWORD');
    await client.query('DROP TABLE IF EXISTS pg_temp.license');
    await client.query('DROP TABLE IF EXISTS pg_temp.mediaitem_transcriptions');
    await client.query('DROP TABLE IF EXISTS pg_temp.chapters');
    await client.query('DROP TABLE IF EXISTS pg_temp.flavor');
    await client.query('DROP TABLE IF EXISTS pg_temp.mediaItem');
});

afterAll(async () => {
    jest.clearAllMocks();
});

jest.mock('../services/apiService');
jest.mock('../services/timer');

const videosToArchive = [{video_id: 'e8a86433-0245-44b8-b0d7-69f6578bac6f'}];
const today = format.asString('dd.MM.yyyy', new Date());

const insertMediaItemReferences = async() => {
    const mediaItem = await client.query("INSERT INTO mediaItem (external_identifier, name, description, collection_id) VALUES ('e8a86433-0245-44b8-b0d7-69f6578bac6f', 'Video', 'Video description', 'collection') RETURNING id");
    const mediaItemId = mediaItem.rows[0].id;
    await client.query('INSERT INTO flavor (media_item_id, mimetype, type, url) VALUES ($1, \'video/mp4\', \'presenter\', \'https://example.com/video.mp4\')', [mediaItemId]);
    await client.query('INSERT INTO chapters (media_item_id, language, vtt_content) VALUES ($1, \'en\', \'WEBVTT\')', [mediaItemId]);
    await client.query('INSERT INTO mediaitem_transcriptions (media_item_id, language, title) VALUES ($1, \'en\', \'English\')', [mediaItemId]);
    await client.query('INSERT INTO license (name, media_item_id) VALUES (\'CC BY\', $1)', [mediaItemId]);
    await client.query('INSERT INTO MEDIAITEM_KEYWORD (MEDIAITEM, KEYWORD) VALUES (\'e8a86433-0245-44b8-b0d7-69f6578bac6f\', 1)');
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

        expect((await client.query('SELECT * FROM mediaItem')).rows).toEqual([]);
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
        expect((await client.query('SELECT * FROM mediaItem')).rows).toEqual([]);
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
        expect((await client.query('SELECT * FROM mediaItem')).rows).toEqual([]);
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

    afterAll( done => {
        client.end().then(done());
    });

});



