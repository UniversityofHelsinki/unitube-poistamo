CREATE TABLE IF NOT EXISTS videos(
                       video_id VARCHAR(255) NOT NULL,
                       archived_date date,
                       actual_archived_date date,
                       deletion_date date,
                       video_creation_date date,
                       error_date date,
                       first_notification_sent_at timestamp,
                       second_notification_sent_at timestamp,
                       third_notification_sent_at timestamp,
                       skip_email boolean default false,
                       cleanup_date date,
                       PRIMARY KEY(video_id)
);

CREATE TABLE IF NOT EXISTS archived_videos_users(
                       video_id VARCHAR(255) NOT NULL,
                       user_id VARCHAR(15) NOT NULL,
                       video_log_id SERIAL NOT NULL,
                       archived_date DATE,
                       created TIMESTAMP,
                       PRIMARY KEY(video_id, user_id)
);

CREATE TABLE IF NOT EXISTS video_logs(
                        video_log_id SERIAL NOT NULL,
                        status_code VARCHAR(255) NOT NULL,
                        oc_messages VARCHAR(255) NOT NULL,
                        video_id VARCHAR(255) NOT NULL,
                        video_name varchar(255),
                        original_series_id varchar(255),
                        original_series_name varchar(255),
                        archived_series_id varchar(255),
                        PRIMARY KEY(video_log_id),
                        CONSTRAINT fk_video
                        FOREIGN KEY(video_id)
                        REFERENCES videos(video_id)
);

CREATE TABLE IF NOT EXISTS email_templates(
                                              id SERIAL NOT NULL,
                                              name VARCHAR(255) UNIQUE NOT NULL,
                                              description VARCHAR(255),
                                              subject VARCHAR(255),
                                              header_fi TEXT,
                                              footer_fi TEXT,
                                              header_sv TEXT,
                                              footer_sv TEXT,
                                              header_en TEXT,
                                              footer_en TEXT,
                                              headingFI TEXT,
                                              headingEN TEXT,
                                              headingSV TEXT,
                                              linkTextFI VARCHAR(255),
                                              linkTextEN VARCHAR(255),
                                              linkTextSV VARCHAR(255),
                                              linkUrlFI VARCHAR(255),
                                              linkUrlEN VARCHAR(255),
                                              linkUrlSV VARCHAR(255),
                                              messageFI TEXT,
                                              messageEN TEXT,
                                              messageSV TEXT,
                                              modified TIMESTAMP,
                                              PRIMARY KEY(id)
);

CREATE TABLE IF NOT EXISTS  thumbnails (
    video_id VARCHAR(255) NOT NULL,
    thumbnail BYTEA,
    PRIMARY KEY(video_id),
    CONSTRAINT fk_video_id
        FOREIGN KEY(video_id)
            REFERENCES videos(video_id)
);

INSERT INTO email_templates (name, description, subject, header_fi, footer_fi, header_sv, footer_sv, header_en, footer_en, headingFI, headingEN, headingSV, linkTextFI, linkTextEN, linkTextSV, linkUrlFI, linkUrlEN, linkUrlSV, messageFI, messageEN, messageSV) VALUES
    ('Vanhenemisviesti', 'Viesti tallenteiden vanhenemisesta', 'Unitube: sinulla on vanhenevia videoita / you have expiring videos / du har videor som går ut', 'För svenska, se nedan / Scroll down for English

Hei!

Saat tämän viestin, koska olet Helsingin yliopiston Unitube-palvelussa yhden tai useamman vanhenevan videotallenteen hallinnoija.

Olet tallenteen hallinnoija silloin, jos olet itse lisännyt ja julkaissut videon jossakin Unitube-tallennekokoelmassa. Voit olla hallinnoija myös siinä tapauksessa, että joku muu on merkinnyt sinut tai ryhmän, johon kuulut, hallinnoijaksi johonkin tallennekokoelmaan Unitube-lataamopalvelussa.

Seuraavan tai seuraavien Unitube-tallenteiden voimassaolo on päättymässä pian:',
     'Kaikilla Unitube-tallenteilla on voimassaoloaika, jonka jälkeen ne poistuvat palvelusta. Voimassaoloaika on aina korkeintaan kolme vuotta kerrallaan. Jos haluat, voit jatkaa itse hallinnoimiesi tallenteiden voimassaoloa Unitube-lataamossa osoitteessa https://lataamo.helsinki.fi.

Voit lajitella hallinnoimasi tallenteet Unitube-lataamossa voimassaolon mukaan. Klikkaamalla tallennetta pääset muokkaamaan sen asetuksia kuten voimassaolopäivää. Voit myös asettaa kerralla saman voimassaolopäivän kaikille yhden hallinnoimasi videokokoelman tallenteille kokoelmavälilehdeltä.

Lisää ohjeita ja yhteystietoja:
https://helpdesk.it.helsinki.fi/help/10654

Terveisin
Helsingin yliopisto
Tietotekniikkakeskus

***',
     'Hej!

Du får det här meddelandet eftersom du är administratör för en eller flera videoinspelningar som går ut i Helsingfors universitets Unitube-tjänst.

Du är administratör för en inspelning om du har lagt till och publicerat en video i en Unitube-inspelningssamling. Du kan också vara administratör om någon annan har lagt till dig eller en grupp som du tillhör som administratör för en samling inspelningar på Unitube-uppladdningssajten.

Följande Unitube-inspelning(ar) går snart ut:', 'Alla Unitube-inspelningar har ett utgångsdatum efter vilket de tas bort från tjänsten. Giltighetstiden kan vara upp till tre år åt gången. Om du vill kan du förlänga giltighetstiden för dina hanterade inspelningar på Unitube-uppladdningssajten på https://lataamo.helsinki.fi.

Du kan sortera dina inspelningar enligt deras utgångsdatum på Unitube-uppladdningssajten. Genom att klicka på en inspelning kan du redigera dess inställningar, till exempel utgångsdatumet. Du kan också ange samma utgångsdatum för alla inspelningar i en enskild videosamling på fliken Mina Samlingar.

Fler instruktioner och kontaktuppgifter:
https://helpdesk.it.helsinki.fi/sv/help/10654

Med vänlig hälsning
Helsingfors universitet
Center för informationsteknologi

***',
     'Hello!

You are the recipient of this message because you are the administrator of one or more expiring video recordings in the University of Helsinki Unitube service.

You are an administrator of a video if you have added and published a video in a Unitube video collection. You may also be an administrator if someone else has added you or a group you belong to as the administrator of a collection of recordings in the Unitube Uploader service.

The following Unitube recording(s) are about to expire soon:', 'All Unitube recordings have an expiration date, after which they will be removed from the service. The validity period can be up to three years at a time. If you wish, you can extend the validity of your managed recordings in the Unitube Uploader service at https://lataamo.helsinki.fi.

You can sort your recordings according to their expiry date in the Unitube Uploader. By clicking on a recording, you can edit its settings, such as the expiry date. You can also set the same expiry date for all the recordings in a single video collection from within the Collections tab.

More instructions and contact details:
https://helpdesk.it.helsinki.fi/en/help/10654

With kind regards,
University of Helsinki
Center for Information Technology

***',
     'Unitube: sinulla on vanhenevia videoita!',
     'Unitube: you have expiring videos!',
     'Unitube: du har videor som går ut!',
     'https://lataamo.helsinki.fi',
     'https://lataamo.helsinki.fi',
     'https://lataamo.helsinki.fi',
     'https://lataamo.helsinki.fi',
     'https://lataamo.helsinki.fi',
     'https://lataamo.helsinki.fi',
     'Saat tämän viestin, koska olet Helsingin yliopiston Unitube-palvelussa yhden tai useamman vanhenevan videotallenteen hallinnoija. Seuraavan tai seuraavien Unitube-tallenteiden voimassaolo on päättymässä pian:',
     'You are the recipient of this message because you are the administrator of one or more expiring video recordings in the University of Helsinki Unitube service. The following Unitube recording(s) are about to expire soon:',
     'Du får det här meddelandet eftersom du är administratör för en eller flera videoinspelningar som går ut i Helsingfors universitets Unitube-tjänst. Följande Unitube-inspelning(ar) går snart ut:'
    )
ON CONFLICT DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
create table if not exists faculties_departments
(
    id        serial
        primary key,
    unique_id integer      not null,
    unit_type varchar(255) not null,
    name_fi   varchar(255) not null,
    name_sv   varchar(255) not null,
    name_en   varchar(255) not null,
    unique (unique_id, unit_type)
);

create unique index if not exists idx_faculties_departments_unit
    on faculties_departments (unique_id, unit_type);

create table if not exists creator
(
    id         serial
        primary key,
    eppn       varchar(255)
        unique,
    first_name varchar(255),
    last_name  varchar(255),
    created    timestamp,
    modified   timestamp
);

create index if not exists idx_creator_first_name_trgm
    on creator using gin (first_name gin_trgm_ops);

create index if not exists idx_creator_last_name_trgm
    on creator using gin (last_name gin_trgm_ops);

create index if not exists idx_creator_eppn_trgm
    on creator using gin (eppn gin_trgm_ops);

create table if not exists content_category
(
    name varchar(255) not null
        unique,
    id   serial
        primary key
);

INSERT INTO content_category (id, name)
VALUES
    (1, 'Opetus'),
    (2, 'Tapahtuma'),
    (3, 'Tutkimus'),
    (4, 'Ohjeet'),
    (5, 'Muu')
ON CONFLICT (name) DO NOTHING;

create table if not exists collection
(
    id                    serial
        primary key,
    external_identifier   varchar(255)  not null
        unique,
    title                 varchar(255)  not null,
    description           varchar(3000) not null,
    visibility            varchar(255)  not null,
    license               varchar(255)  not null,
    opinfi                boolean default false,
    creator               bigint
        references creator,
    science               bigint,
    created               timestamp,
    modified              timestamp,
    is_creator_hidden     boolean default false,
    faculty_department_id integer
        references faculties_departments,
    content_category_id   integer
        constraint fk_collection_content_category
            references content_category
);

create table if not exists media_item
(
    id                     integer default nextval('mediaitem_id_seq'::regclass) not null
        constraint mediaitem_pkey
            primary key,
    external_identifier    varchar(255)                                          not null
        constraint mediaitem_external_identifier_key
            unique,
    name                   varchar(255)                                          not null,
    description            varchar(3000)                                         not null,
    collection_external_id varchar(255)                                          not null,
    duration               bigint,
    created                timestamp,
    modified               timestamp,
    license                varchar(255),
    language               varchar(255),
    science                bigint,
    play_count             integer default 0,
    collection_id          integer                                               not null
        constraint fk_mediaitem_collection
            references collection,
    content_category_id    integer
        constraint fk_media_item_content_category
            references content_category
);

create index if not exists idx_mediaitem_name_trgm
    on media_item using gin (name gin_trgm_ops);

create index if not exists idx_mediaitem_description_trgm
    on media_item using gin (description gin_trgm_ops);

create index if not exists idx_mediaitem_collection_id
    on media_item (collection_external_id);

create index if not exists idx_collection_title_trgm
    on collection using gin (title gin_trgm_ops);

create index if not exists idx_collection_description_trgm
    on collection using gin (description gin_trgm_ops);

create table if not exists license
(
    id            serial
        primary key,
    name          varchar(255) not null,
    media_item_id integer
        unique
        constraint fk_media_item
            references media_item
);

create table if not exists presenter
(
    id    serial
        primary key,
    name  varchar(255) not null,
    phone varchar(255) not null,
    email varchar(255) not null
);

create table if not exists owners
(
    id                     serial
        primary key,
    owner                  varchar(255) not null,
    collection_external_id varchar(255) not null,
    collection_id          integer      not null
        constraint fk_owners_collection
            references collection,
    constraint uk_owners_collection_owner
        unique (collection_id, owner)
);

create table if not exists access_rights
(
    id                     serial
        primary key,
    collection_external_id varchar(255) not null,
    access_rights          varchar(255) not null,
    collection_id          integer      not null
        constraint fk_access_rights_collection
            references collection,
    constraint uk_access_rights
        unique (collection_id, access_rights)
);

create table if not exists flavor
(
    id            serial
        primary key,
    media_item_id integer      not null
        constraint fk_media_item
            references media_item,
    mimetype      varchar(255) not null,
    type          varchar(255) not null,
    url           text         not null,
    unique (media_item_id, type)
);

create table if not exists chapters
(
    id            serial
        primary key,
    media_item_id integer     not null
        constraint fk_media_item
            references media_item,
    language      varchar(10) not null,
    vtt_content   text        not null,
    created_at    timestamp with time zone default CURRENT_TIMESTAMP,
    updated_at    timestamp with time zone default CURRENT_TIMESTAMP,
    unique (media_item_id, language)
);

create table if not exists keyword
(
    id    serial
        primary key,
    label varchar(255)
        unique
);

create table if not exists collection_keyword
(
    collection    varchar(255),
    keyword       bigint
        references keyword,
    collection_id integer not null
        constraint fk_collection_keyword_collection
            references collection,
    constraint uk_collection_keyword
        unique (collection_id, keyword)
);

create index if not exists idx_collection_keyword_collection
    on collection_keyword (collection);

create index if not exists idx_collection_keyword_collection_id
    on collection_keyword (collection_id);

create table if not exists mediaitem_keyword
(
    mediaitem     varchar(255),
    keyword       bigint
        references keyword,
    media_item_id integer not null
        constraint fk_mediaitem_keyword_media_item
            references media_item,
    constraint uk_mediaitem_keyword
        unique (media_item_id, keyword)
);

create index if not exists idx_mediaitem_keyword_media_item_id
    on mediaitem_keyword (media_item_id);

create index if not exists idx_mediaitem_keyword_mediaitem
    on mediaitem_keyword (mediaitem);

create table if not exists mediaitem_transcriptions
(
    id            serial
        primary key,
    media_item_id integer      not null
        constraint fk_media_item
            references media_item,
    title         varchar(255),
    language      varchar(255) not null,
    created_at    timestamp with time zone default CURRENT_TIMESTAMP,
    unique (media_item_id, language)
);

