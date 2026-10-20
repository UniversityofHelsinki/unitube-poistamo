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

/****ACCESS RIGHTS***/

ALTER TABLE access_rights
    RENAME COLUMN collection_id TO collection_external_id;

ALTER TABLE access_rights
    ADD COLUMN collection_id INTEGER;

UPDATE access_rights ar
SET collection_id = c.id
FROM collection c
WHERE c.external_identifier = ar.collection_external_id;

ALTER TABLE access_rights
    ALTER COLUMN collection_id SET NOT NULL;

ALTER TABLE access_rights
    DROP CONSTRAINT access_rights_collection_id_access_rights_key;

ALTER TABLE access_rights
    ADD CONSTRAINT fk_access_rights_collection
        FOREIGN KEY (collection_id)
            REFERENCES collection(id);

ALTER TABLE access_rights
    ADD CONSTRAINT uk_access_rights
        UNIQUE (collection_id, access_rights);

/**********CONTENT TYPE ********/
ALTER TABLE collection
    DROP CONSTRAINT collection_content_type_fkey;
ALTER TABLE media_item
    DROP CONSTRAINT mediaitem_content_type_fkey;

ALTER TABLE content_type
    DROP CONSTRAINT content_type_pkey;

ALTER TABLE content_type
    RENAME TO content_category;

ALTER TABLE content_category
    ADD COLUMN id SERIAL;

ALTER TABLE content_category
    ADD CONSTRAINT content_category_pkey
        PRIMARY KEY (id);

ALTER TABLE content_category
    ADD CONSTRAINT content_category_name_key
        UNIQUE (name);

/****Content category collection muutokset**/
ALTER TABLE collection
    ADD COLUMN content_category_id INTEGER;

UPDATE collection c
SET content_category_id = cc.id
FROM content_category cc
WHERE c.content_type = cc.name;

ALTER TABLE collection
    ADD CONSTRAINT fk_collection_content_category
        FOREIGN KEY (content_category_id)
            REFERENCES content_category(id);

ALTER TABLE media_item
    ADD COLUMN content_category_id INTEGER;

UPDATE media_item mi
SET content_category_id = cc.id
FROM content_category cc
WHERE mi.content_type = cc.name;

ALTER TABLE media_item
    ADD CONSTRAINT fk_media_item_content_category
        FOREIGN KEY (content_category_id)
            REFERENCES content_category(id);

SELECT conname,
       pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'collection'::regclass;

/** VIRW MUUTOS**/
DROP VIEW search_by_video_and_collection_title_and_description_view;
CREATE  VIEW search_by_video_and_collection_title_and_description_view
            (
             collection_id,
             collection_description,
             collection_title,
             video_id,
             video_title,
             video_description,
             video_thumbnail,
             video_language,
             duration,
             license,
             created_date,
             collection_creator,
             search_vector,
             content_category,
             collection_content_category,
             collection_science
                )
AS
SELECT
    c.external_identifier AS collection_id,
    c.description AS collection_description,
    c.title AS collection_title,
    mi.external_identifier AS video_id,
    mi.name AS video_title,
    mi.description AS video_description,
    t.thumbnail AS video_thumbnail,
    mi.language AS video_language,
    mi.duration,
    mi.license,
    mi.created AS created_date,
    c.creator AS collection_creator,

    to_tsvector(
            CASE
                WHEN lower(mi.language) IN ('fi', 'finnish')
                    THEN 'finnish'::regconfig
                WHEN lower(mi.language) IN ('en', 'english')
                    THEN 'english'::regconfig
                WHEN lower(mi.language) IN ('sv', 'swedish')
                    THEN 'swedish'::regconfig
                ELSE 'finnish'::regconfig
                END,
            c.title || ' ' ||
            c.description || ' ' ||
            mi.name || ' ' ||
            mi.description
    ) AS search_vector,

    COALESCE(cc_media.name, cc_collection.name) AS content_type,

    cc_collection.name AS collection_content_category,

    c.science AS collection_science

FROM collection c

         JOIN media_item mi
              ON c.external_identifier = mi.collection_external_id

         JOIN videos v
              ON mi.external_identifier = v.video_id

         LEFT JOIN thumbnails t
                   ON mi.external_identifier = t.video_id

         LEFT JOIN content_category cc_collection
                   ON c.content_category_id = cc_collection.id

         LEFT JOIN content_category cc_media
                   ON mi.content_category_id = cc_media.id

WHERE c.visibility = 'published'
  AND v.actual_archived_date IS NULL
  AND v.deletion_date IS NULL
  AND v.cleanup_date IS NULL
  AND v.error_date IS NULL;

ALTER TABLE collection
DROP COLUMN content_type;

ALTER TABLE media_item DROP column content_type;
