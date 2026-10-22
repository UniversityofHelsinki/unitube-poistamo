const apiService = require('../services/apiService');
const cleanedVideos = require('../services/cleanedVideos');
const timer = require('../services/timer');
const setupTestDatabase = require('./helpers/database');
const client = require('../services/database');
const format = require('date-format');
const Constants = require("../utils/constants");
const crypto = require('crypto');

setupTestDatabase();

beforeEach(async () => {
    await client.query('INSERT INTO videos (video_id, archived_date, video_creation_date, deletion_date) VALUES (\'e8a86433-0245-44b8-b0d7-69f6578bac6f\', \'2018-01-01\'::date, \'2008-01-01\'::date,\'2008-01-01\'::date)');
    const buffer = crypto.randomBytes(128);
    // Convert the buffer to its hexadecimal representation
    const hex = buffer.toString('hex');
    await client.query(`INSERT INTO THUMBNAILS(video_id, thumbnail) VALUES ($1, E'\\\\x${hex}')`, ['e8a86433-0245-44b8-b0d7-69f6578bac6f']);
    await timer.getTimer.mockResolvedValue(0);
},);


afterAll(async () => {
    jest.clearAllMocks();
});

jest.mock('../services/apiService');
jest.mock('../services/timer');

const videosToClean = [{video_id: 'e8a86433-0245-44b8-b0d7-69f6578bac6f'}];
const today = format.asString('dd.MM.yyyy', new Date());
const archivedDate = () => {
    let d = new Date();
    d.setFullYear(d.getFullYear() + Constants.DEFAULT_VIDEO_ARCHIVED_YEAR_AMOUNT);
    return format.asString('dd.MM.yyyy', d);
}

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

const expectMediaItemReferencesRemoved = async() => {
    expect((await client.query('SELECT * FROM media_item')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM flavor')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM chapters')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM mediaitem_transcriptions')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM license')).rows).toEqual([]);
    expect((await client.query('SELECT * FROM MEDIAITEM_KEYWORD')).rows).toEqual([]);
};

describe('Video cleaning', () => {

    it('Cleans a video', async () => {
        await insertMediaItemReferences();
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'video.mp4',
            }
        });
        apiService.getSeries.mockResolvedValue({ status: 200 });
        apiService.cleanVideo.mockResolvedValue({
            status: 202,
            statustext: 'OK'
        });

        await cleanedVideos.cleanVideos(videosToClean);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].oc_messages).toEqual('successfully cleaned video');
        expect(video_logs.rows[1].oc_messages).toEqual('successfully deleted media item');

        const videos = await client.query('SELECT to_char(cleanup_date, \'DD.MM.YYYY\') as cleanup_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].cleanup_date).not.toBeNull();
        expect(videos.rows[0].cleanup_date).toEqual(today);
        await expectMediaItemReferencesRemoved();
    });

    it('Logs when no media item is found for removal', async() => {
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'video.mp4',
            }
        });
        apiService.cleanVideo.mockResolvedValue({ status: 202 });

        await cleanedVideos.cleanVideos(videosToClean);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[1].oc_messages).toEqual('no media item found for removal');

        const videos = await client.query('SELECT to_char(cleanup_date, \'DD.MM.YYYY\') as cleanup_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].cleanup_date).toEqual(today);
    });

    it('Updates cleanup date if video is not found', async() => {
        await insertMediaItemReferences();
        apiService.getEvent.mockResolvedValue({ status: 404 });

        await cleanedVideos.cleanVideos(videosToClean);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].oc_messages).toEqual('error cleaning video, no video found for this id');
        expect(video_logs.rows[1].oc_messages).toEqual('successfully deleted media item');

        const videos = await client.query('SELECT to_char(cleanup_date, \'DD.MM.YYYY\') as cleanup_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].cleanup_date).toEqual(today);
        await expectMediaItemReferencesRemoved();
    });

    it('Error in opencast', async () => {
        await insertMediaItemReferences();
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'video.mp4',
            }
        });
        apiService.cleanVideo.mockResolvedValue({
            status: 500,
            statusText: 'Opencast error'
        });

        await cleanedVideos.cleanVideos(videosToClean);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(2);
        expect(video_logs.rows[0].status_code).toEqual('500');
        expect(video_logs.rows[1].oc_messages).toEqual('successfully deleted media item');
        await expectMediaItemReferencesRemoved();
    });

});
