INSERT INTO collection (external_identifier, title, description, visibility, license, opinfi, created)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (external_identifier) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    visibility = EXCLUDED.visibility,
    license = EXCLUDED.license,
    opinfi = EXCLUDED.opinfi,
    created = EXCLUDED.created;
