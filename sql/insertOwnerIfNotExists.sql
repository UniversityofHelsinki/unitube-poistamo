INSERT INTO owners (collection_id, owner)
VALUES ($1, $2)
ON CONFLICT (collection_id, owner) DO NOTHING;
