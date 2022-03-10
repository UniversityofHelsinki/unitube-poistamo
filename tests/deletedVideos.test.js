const apiService = require('../services/apiService');
const deletedVideos = require('../services/deletedVideos');
const timer = require('../services/timer');
const path = require("path");
require('dotenv').config({path: path.resolve(__dirname, '../.env')});
const client = require('../services/database');
const Pool = require('pg-pool');
var format = require('date-format');
const Constants = require("../utils/constants");

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

    client.query = (text, values) => {
        return pool.query(text, values);
    };
});

beforeEach(async () => {
    await client.query('CREATE TEMPORARY TABLE video_logs(video_log_id SERIAL NOT NULL, status_code VARCHAR(255) NOT NULL, oc_messages VARCHAR(255) NOT NULL, video_id VARCHAR(255) NOT NULL, video_name VARCHAR(255), original_series_id VARCHAR(255), original_series_name VARCHAR(255), archived_series_id varchar(255), PRIMARY KEY(video_log_id))');
    await client.query('CREATE TEMPORARY TABLE videos(video_id VARCHAR(255) NOT NULL, archived_date date, actual_archived_date date, deletion_date date, informed_date date, video_creation_date date, error_date date, PRIMARY KEY(video_id))');
    await wait(100);
    await client.query('INSERT INTO videos (video_id, archived_date, video_creation_date) VALUES (\'e8a86433-0245-44b8-b0d7-69f6578bac6f\', \'2018-01-01\'::date, \'2008-01-01\'::date)');
    await timer.getTimer.mockResolvedValue(0);
},);

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

const videosToDelete = [{video_id: 'e8a86433-0245-44b8-b0d7-69f6578bac6f'}];
const today = format.asString('dd.MM.yyyy', new Date());
const archivedDate = () => {
    let d = new Date();
    d.setFullYear(d.getFullYear() + Constants.DEFAULT_VIDEO_ARCHIVED_YEAR_AMOUNT);
    return format.asString('dd.MM.yyyy', d);
}

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
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].oc_messages).toEqual('successfully deleted video');
        expect(video_logs.rows[0].archived_series_id).toBeNull();

        const videos = await client.query('SELECT to_char(deletion_date, \'DD.MM.YYYY\') as deletion_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].deletion_date).not.toBeNull();
        expect(videos.rows[0].deletion_date).toEqual(today);
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
        expect(video_logs.rows).toHaveLength(1);
        expect(video_logs.rows[0].oc_messages).toEqual('error deleting video, no video found for this id');

        const videos = await client.query('SELECT to_char(deletion_date, \'DD.MM.YYYY\') as deletion_date FROM videos');
        expect(videos.rows).toHaveLength(1);
        expect(videos.rows[0].deletion_date).toEqual(today);
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

    })

});
