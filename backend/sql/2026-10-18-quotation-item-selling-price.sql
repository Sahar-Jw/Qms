-- Store editable material selling price/currency on quotation lines.
-- Run this script OR `npm run migration:run`.
ALTER TABLE `quotation_items`
  ADD `selling_price` decimal(18,4) NULL,
  ADD `selling_currency` varchar(3) NULL;

UPDATE `quotation_items` qi
JOIN `materials` m ON m.id = qi.material_id
SET qi.selling_price = m.selling_price,
    qi.selling_currency = m.selling_currency;
