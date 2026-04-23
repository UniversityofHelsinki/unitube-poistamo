INSERT INTO flavor (media_item_id, mimetype, type, url)
SELECT $1, $2, $3, $4
ON CONFLICT DO NOTHING;
