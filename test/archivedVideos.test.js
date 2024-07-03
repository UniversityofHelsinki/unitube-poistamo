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
    await wait(100);
    await client.query('INSERT INTO videos (video_id, archived_date, video_creation_date) VALUES (\'e8a86433-0245-44b8-b0d7-69f6578bac6f\', \'2018-01-01\'::date, \'2008-01-01\'::date)');
    await timer.getTimer.mockResolvedValue(0);
});

afterEach(async () => {
    await wait(100);
    await client.query('DROP TABLE IF EXISTS pg_temp.videos');
    await client.query('DROP TABLE IF EXISTS pg_temp.video_logs');
});

afterAll(async () => {
    jest.clearAllMocks();
});

jest.mock('../services/apiService');
jest.mock('../services/timer');

const videosToArchive = [{video_id: 'e8a86433-0245-44b8-b0d7-69f6578bac6f'}];
const today = format.asString('dd.MM.yyyy', new Date());

describe('Video archiving tests', () => {

    it('archives a video which is not in archived series', async () => {

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
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].oc_messages).toEqual('successfully archived video');
        expect(video_logs.rows[0].archived_series_id).toEqual(process.env.POISTAMO_OPENCAST_ARCHIVED_SERIES);

        videos = await client.query('SELECT video_id, error_date, to_char(actual_archived_date, \'DD.MM.YYYY\') as actual_archived_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].actual_archived_date).not.toBeNull();
        expect(videos.rows[0].actual_archived_date).toEqual(today);
        expect(videos.rows[0].error_date).toBeNull();
    });


    it('marks a video deleted if it\'s not found from opencast', async () => {

        apiService.getEvent.mockResolvedValue({
            status: 404
        });

        await archivedVideos.archiveVideos(videosToArchive);

        const video_logs = await client.query('SELECT * FROM video_logs');
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].oc_messages).toEqual('error archiving video, no video found for this id');
        expect(video_logs.rows[0].archived_series_id).toBeNull();

        videos = await client.query('SELECT video_id, to_char(actual_archived_date, \'DD.MM.YYYY\') as actual_archived_date, error_date, to_char(deletion_date, \'DD.MM.YYYY\') as deletion_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].actual_archived_date).toEqual(today);
        expect(videos.rows[0].deletion_date).toEqual(today);
        expect(videos.rows[0].error_date).toBeNull();
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
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].oc_messages).toEqual('error archiving video: opencast error');
    });

    afterAll( done => {
        client.end().then(done());
    });

});



