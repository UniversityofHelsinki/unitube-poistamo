WITH media_item AS (
    SELECT id, external_identifier
    FROM mediaItem
    WHERE external_identifier = $1
), deleted_flavors AS (
    DELETE FROM flavor
    WHERE media_item_id IN (SELECT id FROM media_item)
), deleted_chapters AS (
    DELETE FROM chapters
    WHERE media_item_id IN (SELECT id FROM media_item)
), deleted_transcriptions AS (
    DELETE FROM mediaitem_transcriptions
    WHERE media_item_id IN (SELECT id FROM media_item)
), deleted_licenses AS (
    DELETE FROM license
    WHERE media_item_id IN (SELECT id FROM media_item)
), deleted_keywords AS (
    DELETE FROM MEDIAITEM_KEYWORD
    WHERE MEDIAITEM IN (SELECT external_identifier FROM media_item)
)
DELETE FROM mediaItem
WHERE id IN (SELECT id FROM media_item);