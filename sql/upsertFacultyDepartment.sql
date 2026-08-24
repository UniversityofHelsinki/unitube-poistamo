INSERT INTO faculties_departments
    (unique_id, unit_type, name_fi, name_sv, name_en)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (unique_id, unit_type)
DO UPDATE SET
    name_fi = EXCLUDED.name_fi,
    name_sv = EXCLUDED.name_sv,
    name_en = EXCLUDED.name_en;
