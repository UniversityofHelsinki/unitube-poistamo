INSERT INTO owners (collection_external_id, collection_id, owner)
VALUES ($1::varchar, (SELECT id FROM collection WHERE external_identifier = $1::varchar), $2)
ON CONFLICT (collection_id, owner) DO UPDATE SET
    collection_external_id = EXCLUDED.collection_external_id,
    collection_id = EXCLUDED.collection_id,
    owner = EXCLUDED.owner;
