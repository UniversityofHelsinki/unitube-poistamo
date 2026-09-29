const apiService = require('../services/apiService');
const deletedVideos = require('../services/deletedVideos');
const timer = require('../services/timer');
const path = require("path");
require('dotenv').config({path: path.resolve(__dirname, '../.env')});
const client = require('../services/database');
const Pool = require('pg-pool');
const format = require('date-format');
const Constants = require("../utils/constants");
const crypto = require('crypto');

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
    await client.query('CREATE TEMPORARY TABLE THUMBNAILS(video_id VARCHAR(255) NOT NULL,\n' +
        '    thumbnail BYTEA,\n' +
        '    PRIMARY KEY(video_id),\n' +
        '    CONSTRAINT fk_video_id\n' +
        '        FOREIGN KEY(video_id)\n' +
        '            REFERENCES videos(video_id))')
    await wait(100);
    await client.query('INSERT INTO videos (video_id, archived_date, video_creation_date) VALUES (\'e8a86433-0245-44b8-b0d7-69f6578bac6f\', \'2018-01-01\'::date, \'2008-01-01\'::date)');
    await insertMediaItemReferences();
    const buffer = crypto.randomBytes(128);
    // Convert the buffer to its hexadecimal representation
    const hex = buffer.toString('hex');
    await client.query(`INSERT INTO THUMBNAILS(video_id, thumbnail) VALUES ($1, E'\\\\x${hex}')`, ['e8a86433-0245-44b8-b0d7-69f6578bac6f']);
    await timer.getTimer.mockResolvedValue(0);
},);

afterEach(async () => {
    await wait(100);
    await client.query('DROP TABLE IF EXISTS pg_temp.thumbnails');
    await client.query('DROP TABLE IF EXISTS pg_temp.MEDIAITEM_KEYWORD');
    await client.query('DROP TABLE IF EXISTS pg_temp.license');
    await client.query('DROP TABLE IF EXISTS pg_temp.mediaitem_transcriptions');
    await client.query('DROP TABLE IF EXISTS pg_temp.chapters');
    await client.query('DROP TABLE IF EXISTS pg_temp.flavor');
    await client.query('DROP TABLE IF EXISTS pg_temp.mediaItem');
    await client.query('DROP TABLE IF EXISTS pg_temp.videos');
    await client.query('DROP TABLE IF EXISTS pg_temp.video_logs');
});

afterAll(async () => {
    jest.clearAllMocks();
});

jest.mock('../services/apiService');
jest.mock('../services/timer');

const videosToDelete = [{video_id: 'e8a86433-0245-44b8-b0d7-69f6578bac6f'}];
const today = format.asString('dd.MM.yyyy', new Date());
const archivedDate = () => {
    let d = new Date();
    d.setFullYear(d.getFullYear() + Constants.DEFAULT_VIDEO_ARCHIVED_YEAR_AMOUNT);
    return format.asString('dd.MM.yyyy', d);
}

const insertMediaItemReferences = async() => {
    const mediaItem = await client.query("INSERT INTO mediaItem (external_identifier, name, description, collection_id) VALUES ('e8a86433-0245-44b8-b0d7-69f6578bac6f', 'Video', 'Video description', 'collection') RETURNING id");
    const mediaItemId = mediaItem.rows[0].id;
    await client.query('INSERT INTO flavor (media_item_id, mimetype, type, url) VALUES ($1, \'video/mp4\', \'presenter\', \'https://example.com/video.mp4\')', [mediaItemId]);
    await client.query('INSERT INTO chapters (media_item_id, language, vtt_content) VALUES ($1, \'en\', \'WEBVTT\')', [mediaItemId]);
    await client.query('INSERT INTO mediaitem_transcriptions (media_item_id, language, title) VALUES ($1, \'en\', \'English\')', [mediaItemId]);
    await client.query('INSERT INTO license (name, media_item_id) VALUES (\'CC BY\', $1)', [mediaItemId]);
    await client.query('INSERT INTO MEDIAITEM_KEYWORD (MEDIAITEM, KEYWORD) VALUES (\'e8a86433-0245-44b8-b0d7-69f6578bac6f\', 1)');
};

const expectMediaItemReferencesRemoved = async() => {
    expect((await client.query('SELECT * FROM mediaItem')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM flavor')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM chapters')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM mediaitem_transcriptions')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM license')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM MEDIAITEM_KEYWORD')).rows).toEqual([]);
};

describe('Video deleting', () => {

    it('Deletes a video', async () => {
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'video.mp4',
            }
        });
        apiService.getSeries.mockResolvedValue({ status: 200 });
        apiService.deleteVideo.mockResolvedValue({
            status: 200,
            statustext: 'OK'
        });

        await deletedVideos.deleteVideos(videosToDelete);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(3);
        expect(video_logs.rows[0].oc_messages).toEqual('successfully deleted video');
        expect(video_logs.rows[0].archived_series_id).toBeNull();
        expect(video_logs.rows[1].oc_messages).toEqual('successfully deleted thumbnail');
        expect(video_logs.rows[2].oc_messages).toEqual('successfully deleted media item');

        const videos = await client.query('SELECT to_char(deletion_date, \'DD.MM.YYYY\') as deletion_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].deletion_date).not.toBeNull();
        expect(videos.rows[0].deletion_date).toEqual(today);
        await expectMediaItemReferencesRemoved();
    });

    it('Updates deletion date if series is not found', async() => {
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'video.mp4',
            }
        });
        apiService.getSeries.mockResolvedValue({ status: 400 });

        await deletedVideos.deleteVideos(videosToDelete);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(1);

        const videos = await client.query('SELECT to_char(deletion_date, \'DD.MM.YYYY\') as deletion_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].deletion_date).toEqual(today);
    });

    it('Updates deletion date if video is not found', async() => {
        apiService.getEvent.mockResolvedValue({ status: 404 });

        await deletedVideos.deleteVideos(videosToDelete);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].oc_messages).toEqual('error deleting video, no video found for this id');
        expect(video_logs.rows[1].oc_messages).toEqual('successfully deleted media item');

        const videos = await client.query('SELECT to_char(deletion_date, \'DD.MM.YYYY\') as deletion_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].deletion_date).toEqual(today);
        await expectMediaItemReferencesRemoved();
    });

    it('logs when no media item is found for removal', async() => {
        const videoWithoutMediaItem = [{video_id: 'video-without-media-item'}];
        apiService.getEvent.mockResolvedValue({ status: 404 });

        await deletedVideos.deleteVideos(videoWithoutMediaItem);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[1].status_code).toEqual('200');
        expect(video_logs.rows[1].oc_messages).toEqual('no media item found for removal');
        expect(video_logs.rows[1].video_id).toEqual('video-without-media-item');
    });

    it('Empty actual archive date and deletion date if video is not in archived series', async() => {
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'video.mp4',
            }
        });
        apiService.getSeries.mockResolvedValue({status: 200});
        apiService.deleteVideo.mockResolvedValue({
            status: 405,
            statusText: 'video is not in archived series skipping to next one'
        });

        await deletedVideos.deleteVideos(videosToDelete);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].status_code).toEqual('405');

        const videos = await client.query('SELECT deletion_date, actual_archived_date, to_char(archived_date, \'DD.MM.YYYY\') as archived_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].archived_date).toEqual(archivedDate());
        expect(videos.rows[0].deletion_date).toBeNull();
        expect(videos.rows[0].actual_archived_date).toBeNull();
    });

    it('Error in opencast', async () => {
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'video.mp4',
            }
        });
        apiService.getSeries.mockResolvedValue({status: 200});
        apiService.deleteVideo.mockResolvedValue({
            status: 500,
            statusText: 'Opencast error'
        });

        await deletedVideos.deleteVideos(videosToDelete);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].status_code).toEqual('500');

    });

    it('removes media item references when event lookup fails', async () => {
        apiService.getEvent.mockRejectedValue(new Error('Opencast unavailable'));

        await deletedVideos.deleteVideos(videosToDelete);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].status_code).toEqual('500');
        expect(video_logs.rows[0].oc_messages).toEqual('Opencast unavailable');
        expect(video_logs.rows[1].oc_messages).toEqual('successfully deleted media item');
        await expectMediaItemReferencesRemoved();
    });

    afterAll( done => {
        client.end().then(done());
    });

});
