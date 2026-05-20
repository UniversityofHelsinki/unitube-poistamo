INSERT INTO mediaItem (external_identifier, name, description, collection_id, duration, created)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (external_identifier) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    collection_id = EXCLUDED.collection_id,
    duration = EXCLUDED.duration,
    created = EXCLUDED.created
RETURNING id;

