INSERT INTO access_rights (collection_external_id, collection_id, access_rights)
VALUES ($1::varchar, (SELECT id FROM collection WHERE external_identifier = $1::varchar), $2)
ON CONFLICT (collection_id, access_rights) DO UPDATE SET
    collection_external_id = EXCLUDED.collection_external_id,
    collection_id = EXCLUDED.collection_id,
    access_rights = EXCLUDED.access_rights;
