INSERT INTO mediaitem_transcriptions (media_item_id, language, title, created_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (media_item_id, language) DO UPDATE SET
    title = EXCLUDED.title;
