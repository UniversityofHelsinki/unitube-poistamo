const apiService = require('../services/apiService');
const archivedVideos = require('../services/archivedVideos');
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const videosToArchive =
    [{  video_id: 'e8a86433-0245-44b8-b0d7-69f6578bac6f',
        archived_date: '2021-02-11T22:00:00.000Z' }];

jest.mock('../services/apiService');

xit('archives a video which is not in archived series', async () => {

    apiService.getEvent.mockResolvedValue( {
        status: 200,
            data: {
            identifier: 'e8a86433-0245-44b8-b0d7-69f6578bac6f',
            is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
            title: 'pienivideo.mp4',
        }});
    apiService.getSeries.mockResolvedValue({
        status: 200,
        data: {
            identifier: '379fb94c-f194-422a-be6e-fc24f9507b95',
            title: 'joku sarja',
        }});
    apiService.moveVideoToArchivedSeries.mockResolvedValue( {
        status: 200,
        statusText: 'OK'
    });

    const archiveVideos = await archivedVideos.archiveVideos(videosToArchive);
});

xit('doesnt archive a video which is not found from opencast', async () => {
    apiService.getEvent.mockResolvedValue({
        status: 200
    });
} )

xit('doesnt archive a video if series is not found', async () => {
    apiService.getEvent.mockResolvedValue( {
        status: 200,
        data: {
            is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
            title: 'pienivideo.mp4',
        }});
    apiService.getSeries.mockResolvedValue({
        status: 400
    });

})

xit('doesnt archive a video which is already in archived series', async() => {
    apiService.getEvent.mockResolvedValue( {
        status: 200,
        data: {
            is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
            title: 'pienivideo.mp4',
        }});
    apiService.moveVideoToArchivedSeries.mockResolvedValue({
        status: 405,
        statusText: 'video already in archived series skipping to next one'
    });
})

xit('error in opencast archiving', async () => {
    apiService.getEvent.mockResolvedValue( {
        status: 200,
        data: {
            is_part_of: '0345f162-9bbe-48fe-bd6f-f061a3300485',
            title: 'pienivideo.mp4',
        }});
    apiService.moveVideoToArchivedSeries.mockResolvedValue({
        status: 500,
        statusText: 'opencast error'
    });

})

