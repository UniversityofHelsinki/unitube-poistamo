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
