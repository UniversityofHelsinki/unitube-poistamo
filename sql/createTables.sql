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
    modified TIMESTAMP,
    PRIMARY KEY(id)
    );

INSERT INTO email_templates (name, description, subject, header_fi, footer_fi) VALUES
    ('Vanhenemisviesti', 'Viesti tallenteiden vanhenemisesta', 'Unitube: sinulla on vanhenevia tallenteita / you have expiring videos / du har videon som föråldras', 'Hei!Saat tämän viestin, koska olet Helsingin yliopiston Unitube-palvelussa yhden tai useamman vanhenevan videotallenteen hallinnoija.
Seuraavan tai seuraavien Unitube-tallenteiden voimassaolo on päättymässä pian:Olet tallenteen hallinnoija silloin, jos olet itse lisännyt ja julkaissut videon jossakin Unitube-videosarjassa. Voit olla hallinnoija myös siinä tapauksessa, että joku muu on merkinnyt sinut tai ryhmän, johon kuulut, hallinnoijaksi johonkin tallennesarjaan Unitube-lataamopalvelussa.[Tunnuksesi on lisätty Unitubessa hallinnoijaksi seuraaviin ryhmiin: ',
     'Kaikilla Unitube-tallenteilla on voimassaoloaika, jonka jälkeen ne poistuvat palvelusta. Voimassaoloaika on aina korkeintaan kolme vuotta kerrallaan. Jos haluat, voit jatkaa itse hallinnoimiesi tallenteiden voimassaoloa Unitube-lataamossa osoitteessa https://lataamo.helsinki.fi.
Voit lajitella hallinnoimasi tallenteet Unitube-lataamon voimassaolon mukaan. Pian vanhenevat videot on korostettu listanäkymässä värin ja kuvakkeen avulla. Klikkaamalla tallennetta pääset muokkaamaan sen asetuksia kuten voimassaolopäivää. Voit myös asettaa kerralla saman voimassaolopäivän kaikille yhden hallinnoimasi videosarjasi tallenteille sarjavälilehdeltä.Lisää ohjeita ja yhteystietoja:
https://helpdesk.it.helsinki.fi/help/10654"')
ON CONFLICT DO NOTHING;
