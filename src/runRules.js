import { Worker } from 'node:worker_threads';

const WORKERS = 3;
// Rules known to take 50 ms or more: dealt first so no worker ends up with several of them.
const HEAVY_RULES = ['THEME', 'LIB_EXPORTS_UNUSED', 'LIB_UNUSED', 'VUE_UNUSED_EVENTS', 'VMC_UNUSED_VAL', 'TERMS'];

// Each worker builds its own index (cheap once the parse cache is warm) and validates a slice of the rules, so the
// 13 MB index never has to be cloned across threads. SPELL has its own workers, see rules/SPELL.js.
export async function startRules(filesPaths, ruleIds) {
  const ids = ruleIds.filter((id) => id !== 'SPELL');
  const byWeight = [...HEAVY_RULES.filter((id) => ids.includes(id)), ...ids.filter((id) => !HEAVY_RULES.includes(id))];
  const slices = Array.from({ length: WORKERS }, (_, i) => byWeight.filter((_, j) => j % WORKERS === i));

  const results = await Promise.all(
    slices.map((sliceIds, i) => validateInWorker(filesPaths, sliceIds, { primary: i === 0 }))
  );

  return new Map(results.flat());
}

function validateInWorker(filesPaths, ruleIds, { primary }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./rulesWorker.js', import.meta.url), {
      workerData: { filesPaths, ruleIds, primary },
    });
    worker.once('message', resolve);
    worker.once('error', reject);
  });
}
