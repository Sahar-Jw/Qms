-- Allow a material code or name to be reused independently, but not the same pair.
-- Skip this file if `npm run migration:run` / DB_MIGRATIONS_RUN=true already ran the migration.
ALTER TABLE `materials`
  DROP INDEX `IDX_180eec59d9027e95b2467ec66f`,
  ADD UNIQUE INDEX `UQ_materials_material_code_name` (`material_code`, `name`);

-- Rollback only if no material codes have been reused:
-- ALTER TABLE `materials` DROP INDEX `UQ_materials_material_code_name`,
--   ADD UNIQUE INDEX `IDX_180eec59d9027e95b2467ec66f` (`material_code`);
