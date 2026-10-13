-- Permanently deletes imported data and keyword associations.
-- Recreate these tables before running the import script.
BEGIN;

DROP TABLE IF EXISTS license RESTRICT;
DROP TABLE IF EXISTS flavor RESTRICT;
DROP TABLE IF EXISTS chapters RESTRICT;
DROP TABLE IF EXISTS mediaitem_transcriptions RESTRICT;
DROP TABLE IF EXISTS owners RESTRICT;
DROP TABLE IF EXISTS access_rights RESTRICT;
DROP TABLE IF EXISTS collection_keyword RESTRICT;
DROP TABLE IF EXISTS mediaitem_keyword RESTRICT;
DROP TABLE IF EXISTS media_item RESTRICT;
DROP TABLE IF EXISTS collection RESTRICT;

COMMIT;
