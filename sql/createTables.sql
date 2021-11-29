CREATE TABLE IF NOT EXISTS videos(
                       video_id INT,
                       archived_date date,
                       deletion_date date,
                       informed_date date,
                       PRIMARY KEY(video_id)
);

CREATE TABLE IF NOT EXISTS video_logs(
                        video_log_id INT,
                        status_code VARCHAR(255) NOT NULL,
                        oc_logs VARCHAR(255) NOT NULL,
                        video_id INT,
                        PRIMARY KEY(video_log_id),
                        CONSTRAINT fk_video
                        FOREIGN KEY(video_id)
                        REFERENCES videos(video_id)
);


