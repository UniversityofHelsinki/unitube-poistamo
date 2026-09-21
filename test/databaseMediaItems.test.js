const path = require("path");
require('dotenv').config({path: path.resolve(__dirname, '../.env')});
const client = require('../services/database');
const Pool = require('pg-pool');
const databaseService = require('../services/databaseService');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

beforeAll(async () => {
    const pool = new Pool({
        user: process.env.POSTGRES_USER,
        host: process.env.HOST,
        database: process.env.DATABASE,
        password: process.env.PASSWORD,
        port: process.env.PORT,
        ssl: process.env.SSL ? true : false,
        max: 1,
        idleTimeoutMillis: 0
    });

    client.end = () => {
        return pool.end();
    };

    client.query = (text, values) => {
        return pool.query(text, values);
    };
});

beforeEach(async () => {
    await client.query(`
        CREATE TEMPORARY TABLE mediaItem (
            id SERIAL PRIMARY KEY,
            external_identifier VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            description VARCHAR(3000) NOT NULL,
            collection_id VARCHAR(255) NOT NULL,
            duration bigint,
            created TIMESTAMP,
            modified TIMESTAMP,
            license VARCHAR(255),
            language VARCHAR(255),
            content_type varchar(255),
            play_count INTEGER DEFAULT 0
        )
    `);
    await wait(100);
});

afterEach(async () => {
    await wait(100);
    await client.query('DROP TABLE IF EXISTS pg_temp.mediaItem');
});

afterAll(async () => {
    await client.end();
});

describe('MediaItem upsert tests', () => {
    it('inserts a new mediaItem with play_count', async () => {
        const mediaItem = {
            external_identifier: 'test-event-1',
            name: 'Test Video',
            description: 'Test Description',
            collection_id: 'test-collection-1',
            duration: 120,
            created: new Date(),
            license: 'CC BY',
            language: 'fi',
            play_count: 42
        };

        const id = await databaseService.upsertMediaItem(mediaItem);
        expect(id).toBeDefined();

        const result = await client.query('SELECT * FROM mediaItem WHERE external_identifier = $1', ['test-event-1']);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].play_count).toEqual(42);
        expect(result.rows[0].name).toEqual('Test Video');
        expect(result.rows[0].language).toEqual('fi');
    });

    it('updates play_count on existing mediaItem on conflict', async () => {
        const mediaItem = {
            external_identifier: 'test-event-2',
            name: 'Original Video',
            description: 'Original Description',
            collection_id: 'test-collection-1',
            duration: 120,
            created: new Date(),
            license: 'CC BY',
            language: 'fi',
            play_count: 10
        };

        const id1 = await databaseService.upsertMediaItem(mediaItem);
        expect(id1).toBeDefined();

        const updatedMediaItem = {
            external_identifier: 'test-event-2',
            name: 'Updated Video',
            description: 'Updated Description',
            collection_id: 'test-collection-1',
            duration: 150,
            created: new Date(),
            license: 'CC BY',
            language: 'en',
            play_count: 55
        };

        const id2 = await databaseService.upsertMediaItem(updatedMediaItem);
        expect(id2).toEqual(id1);

        const result = await client.query('SELECT * FROM mediaItem WHERE external_identifier = $1', ['test-event-2']);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].play_count).toEqual(55);
        expect(result.rows[0].name).toEqual('Updated Video');
        expect(result.rows[0].language).toEqual('en');
    });

    it('supports playCount property name and defaults to 0 when missing', async () => {
        const mediaItemWithCamelCase = {
            external_identifier: 'test-event-3',
            name: 'CamelCase Video',
            description: 'Description',
            collection_id: 'test-collection-1',
            duration: 60,
            created: null,
            license: 'CC BY',
            language: null,
            playCount: 15
        };

        await databaseService.upsertMediaItem(mediaItemWithCamelCase);
        let result = await client.query('SELECT * FROM mediaItem WHERE external_identifier = $1', ['test-event-3']);
        expect(result.rows[0].play_count).toEqual(15);

        const mediaItemWithoutPlayCount = {
            external_identifier: 'test-event-4',
            name: 'No Play Count Video',
            description: 'Description',
            collection_id: 'test-collection-1',
            duration: 60,
            created: null,
            license: 'CC BY',
            language: null
        };

        await databaseService.upsertMediaItem(mediaItemWithoutPlayCount);
        result = await client.query('SELECT * FROM mediaItem WHERE external_identifier = $1', ['test-event-4']);
        expect(result.rows[0].play_count).toEqual(0);
    });
});
