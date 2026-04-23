INSERT INTO collection (external_identifier, title, description, visibility, license, opinfi)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (external_identifier) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    visibility = EXCLUDED.visibility,
    license = EXCLUDED.license,
    opinfi = EXCLUDED.opinfi;
