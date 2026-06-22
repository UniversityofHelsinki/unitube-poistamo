INSERT INTO mediaItem (external_identifier, name, description, collection_id, duration, created, license, language)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (external_identifier) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    collection_id = EXCLUDED.collection_id,
    duration = EXCLUDED.duration,
    created = EXCLUDED.created,
    license = EXCLUDED.license,
    language = COALESCE(EXCLUDED.language, mediaItem.language)
RETURNING id;

