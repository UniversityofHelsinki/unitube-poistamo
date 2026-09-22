INSERT INTO chapters (media_item_id, language, vtt_content)
VALUES ($1, $2, $3)
ON CONFLICT (media_item_id, language) DO UPDATE SET
    vtt_content = EXCLUDED.vtt_content,
    updated_at = CURRENT_TIMESTAMP;
