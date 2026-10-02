/*ALTER TABLE mediaitem
    RENAME TO media_item;*/

--New key with actual name to the table DONE
ALTER TABLE media_item
    ADD COLUMN collection_fk INTEGER;

-- Fill new column DONE
UPDATE media_item m
SET collection_fk = c.id
    FROM collection c
WHERE m.collection_id = c.external_identifier;

-- add FK NOT DONE
ALTER TABLE media_item
    ADD CONSTRAINT fk_mediaitem_collection
        FOREIGN KEY (collection_fk)
            REFERENCES collection(id);


-- Rename
/**
  collection_id -> collection_external id. Remove fk
  collection_fk -> collection_id
 */
ALTER TABLE media_item
    RENAME COLUMN collection_id
    TO collection_external_id;

ALTER TABLE media_item
    RENAME COLUMN collection_fk
    TO collection_id;

ALTER TABLE media_item
    ALTER COLUMN collection_id SET NOT NULL;


/* collection_keywords */
--collection keywords
ALTER TABLE collection_keyword
    ADD COLUMN collection_id INTEGER;

UPDATE collection_keyword ck
SET collection_id = c.id
    FROM collection c
WHERE c.external_identifier = ck.collection;

CREATE INDEX idx_collection_keyword_collection_id
    ON collection_keyword(collection_id);

ALTER TABLE collection_keyword
    ADD CONSTRAINT fk_collection_keyword_collection
        FOREIGN KEY (collection_id)
            REFERENCES collection(id);

ALTER TABLE collection_keyword
    ALTER COLUMN collection_id SET NOT NULL;

ALTER TABLE collection_keyword
DROP CONSTRAINT collection_keyword_collection_keyword_key;

ALTER TABLE collection_keyword
    ADD CONSTRAINT uk_collection_keyword
        UNIQUE(collection_id, keyword);