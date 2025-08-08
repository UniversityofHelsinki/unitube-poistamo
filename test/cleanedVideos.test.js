const apiService = require('../services/apiService');
const cleanedVideos = require('../services/cleanedVideos');
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
    await client.query('CREATE TEMPORARY TABLE videos(video_id VARCHAR(255) NOT NULL, archived_date date, actual_archived_date date, deletion_date date, video_creation_date date, error_date date, cleanup_date date, PRIMARY KEY(video_id))');
    await client.query('CREATE TEMPORARY TABLE THUMBNAILS(video_id VARCHAR(255) NOT NULL,\n' +
        '    thumbnail BYTEA,\n' +
        '    PRIMARY KEY(video_id),\n' +
        '    CONSTRAINT fk_video_id\n' +
        '        FOREIGN KEY(video_id)\n' +
        '            REFERENCES videos(video_id))')
    await wait(100);
    await client.query('INSERT INTO videos (video_id, archived_date, video_creation_date, deletion_date) VALUES (\'e8a86433-0245-44b8-b0d7-69f6578bac6f\', \'2018-01-01\'::date, \'2008-01-01\'::date,\'2008-01-01\'::date)');
    const buffer = crypto.randomBytes(128);
    // Convert the buffer to its hexadecimal representation
    const hex = buffer.toString('hex');
    await client.query(`INSERT INTO THUMBNAILS(video_id, thumbnail) VALUES ($1, E'\\\\x${hex}')`, ['e8a86433-0245-44b8-b0d7-69f6578bac6f']);
    await timer.getTimer.mockResolvedValue(0);
},);

afterEach(async () => {
    await wait(100);
    await client.query('DROP TABLE IF EXISTS pg_temp.thumbnails');
    await client.query('DROP TABLE IF EXISTS pg_temp.videos');
    await client.query('DROP TABLE IF EXISTS pg_temp.video_logs');
});

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

describe('Video cleaning', () => {

    it('Cleans a video', async () => {
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
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].oc_messages).toEqual('successfully cleaned video');

        const videos = await client.query('SELECT to_char(cleanup_date, \'DD.MM.YYYY\') as cleanup_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].cleanup_date).not.toBeNull();
        expect(videos.rows[0].cleanup_date).toEqual(today);
    });

    it('Updates cleaned date if series is not found', async() => {
        apiService.getEvent.mockResolvedValue({
            status: 200,
            data: {
                is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
                title: 'video.mp4',
            }
        });
        apiService.getSeries.mockResolvedValue({ status: 400 });

        await cleanedVideos.cleanVideos(videosToClean);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(1);

        const videos = await client.query('SELECT to_char(cleanup_date, \'DD.MM.YYYY\') as cleanup_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].cleanup_date).toEqual(today);
    });

    it('Updates cleanup date if video is not found', async() => {
        apiService.getEvent.mockResolvedValue({ status: 404 });

        await cleanedVideos.cleanVideos(videosToClean);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].oc_messages).toEqual('error cleaning video, no video found for this id');

        const videos = await client.query('SELECT to_char(cleanup_date, \'DD.MM.YYYY\') as cleanup_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].cleanup_date).toEqual(today);
    });

    it('Error in opencast', async () => {
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
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].status_code).toEqual('500');
    });

    afterAll( done => {
        client.end().then(done());
    });

});
