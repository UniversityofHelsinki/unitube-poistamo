CREATE TABLE IF NOT EXISTS videos(
                       video_id VARCHAR(255) NOT NULL,
                       archived_date date,
                       actual_archived_date date,
                       deletion_date date,
                       informed_date date,
                       video_creation_date date,
                       PRIMARY KEY(video_id)
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


