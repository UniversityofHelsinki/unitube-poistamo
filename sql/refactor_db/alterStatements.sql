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


-- media_item keyword
ALTER TABLE mediaitem_keyword
    ADD COLUMN media_item_id INTEGER;

UPDATE mediaitem_keyword mk
SET media_item_id = mi.id
    FROM media_item mi
WHERE mi.external_identifier = mk.mediaitem;


ALTER TABLE mediaitem_keyword
    ADD CONSTRAINT fk_mediaitem_keyword_media_item
        FOREIGN KEY (media_item_id)
            REFERENCES media_item(id);

ALTER TABLE mediaitem_keyword
    ADD CONSTRAINT uk_mediaitem_keyword
        UNIQUE (media_item_id, keyword);

ALTER TABLE mediaitem_keyword
    ALTER COLUMN media_item_id SET NOT NULL;

ALTER TABLE mediaitem_keyword
DROP CONSTRAINT mediaitem_keyword_mediaitem_keyword_key;

DROP INDEX IF EXISTS idx_mediaitem_keyword_mediaitem;
CREATE INDEX idx_mediaitem_keyword_media_item_id
    ON mediaitem_keyword (media_item_id);

/*****OWNERS*/
ALTER TABLE owners
    RENAME COLUMN collection_id TO collection_external_id;

ALTER TABLE owners
    ADD COLUMN collection_id INTEGER;

UPDATE owners o
SET collection_id = c.id
FROM collection c
WHERE c.external_identifier = o.collection_external_id;

ALTER TABLE owners
    ALTER COLUMN collection_id SET NOT NULL;

ALTER TABLE owners
    DROP CONSTRAINT fk_collection;

ALTER TABLE owners
    ADD CONSTRAINT fk_owners_collection
        FOREIGN KEY (collection_id)
            REFERENCES collection(id);

ALTER TABLE owners
    DROP CONSTRAINT owners_collection_id_owner_key;

ALTER TABLE owners
    ADD CONSTRAINT uk_owners_collection_owner
        UNIQUE (collection_id, owner);



