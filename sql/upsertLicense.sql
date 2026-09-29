INSERT INTO license (name, media_item_id)
VALUES ($1, $2)
ON CONFLICT (media_item_id) DO UPDATE SET
    name = EXCLUDED.name;