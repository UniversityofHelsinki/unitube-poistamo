INSERT INTO access_rights (collection_id, access_rights)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;
