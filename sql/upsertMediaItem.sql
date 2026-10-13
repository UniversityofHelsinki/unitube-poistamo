INSERT INTO media_item (external_identifier, name, description, collection_external_id, collection_id, duration, created, language, play_count)
VALUES ($1, $2, $3, $4::varchar, (SELECT id FROM collection WHERE external_identifier = $4::varchar), $5, $6, $7, $8)
ON CONFLICT (external_identifier) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    collection_external_id = EXCLUDED.collection_external_id,
    collection_id = EXCLUDED.collection_id,
    duration = EXCLUDED.duration,
    created = EXCLUDED.created,
    language = COALESCE(EXCLUDED.language, media_item.language),
    play_count = EXCLUDED.play_count
RETURNING id;

