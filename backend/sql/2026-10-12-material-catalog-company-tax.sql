-- Material image/catalog files and company-level quotation tax settings.
-- Run this script OR `npm run migration:run`. If both are run, the migration
-- detects these columns and skips the already-applied schema changes.

ALTER TABLE `materials`
  CHANGE `catalogue` `img` varchar(150) NULL,
  ADD `catalog` json NULL;

ALTER TABLE `companies`
  ADD `tax_enabled` tinyint NOT NULL DEFAULT 0,
  ADD `tax_percentage` decimal(7,4) NULL;

-- Undo (only if no catalog documents have been uploaded):
-- ALTER TABLE `companies` DROP COLUMN `tax_percentage`, DROP COLUMN `tax_enabled`;
-- ALTER TABLE `materials` DROP COLUMN `catalog`, CHANGE `img` `catalogue` varchar(150) NULL;
