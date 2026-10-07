import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

/** Normalizes existing quotation rows to draft, expired, locked or invoiced. */
async function main() {
  const ds = new DataSource(buildDataSourceOptions());
  await ds.initialize();
  try {
    await ds.query(
      `UPDATE quotations
          SET status = CASE
            WHEN status IN ('locked', 'invoiced') THEN status
            WHEN validity IS NOT NULL AND validity < CURRENT_DATE THEN 'expired'
            ELSE 'draft'
          END
        WHERE status NOT IN ('draft', 'expired', 'locked', 'invoiced')
           OR (status = 'draft' AND validity IS NOT NULL AND validity < CURRENT_DATE)
           OR (status = 'expired' AND (validity IS NULL OR validity >= CURRENT_DATE))`,
    );
    console.log('Quotation statuses normalized: draft, expired, locked, invoiced');
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
