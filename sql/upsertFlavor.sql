INSERT INTO flavor (media_item_id, mimetype, type, url)
VALUES ($1, $2, $3, $4)
ON CONFLICT (media_item_id, type) DO UPDATE SET
    mimetype = EXCLUDED.mimetype,
    url = EXCLUDED.url;
