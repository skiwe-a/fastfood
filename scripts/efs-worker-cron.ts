// ============================================================
// EFS Worker — Cron Job (Lite)
// Can be called via Vercel Cron: /api/cron/efs-worker
// Or run locally: npx tsx scripts/efs-worker-cron.ts
// ============================================================

import { runEfsWorker } from '../src/lib/algorithm/efs-worker';

async function main() {
  console.log('='.repeat(60));
  console.log('[EFS-Cron] Lite Worker starting at', new Date().toISOString());
  console.log('='.repeat(60));

  // Run pre-computation cycle
  const result = await runEfsWorker();

  console.log('\n[EFS-Cron] Cycle complete:');
  console.log('  Processed:', result.processed);
  console.log('  Success:  ', result.success);
  console.log('  Failed:   ', result.failed);
  console.log('  Avg/user: ', result.avgDuration.toFixed(0), 'ms');
  console.log('  Total:    ', result.totalDuration, 'ms');
  console.log('');

  process.exit(0);
}

main().catch((err) => {
  console.error('[EFS-Cron] Fatal error:', err);
  process.exit(1);
});
