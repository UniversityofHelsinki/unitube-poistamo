INSERT INTO access_rights (collection_id, access_rights)
VALUES ($1, $2)
ON CONFLICT (collection_id, access_rights) DO UPDATE SET
    collection_id = EXCLUDED.collection_id,
    access_rights = EXCLUDED.access_rights;
