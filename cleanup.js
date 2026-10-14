import { listFiles } from './src/indexFiles.js';
import { listRuleIds } from './src/listRules.js';
import { applyFormatting, startPrettify } from './src/prettify.js';
import { log, printReport } from './src/printReport.js';
import { startRules } from './src/runRules.js';
import { startSpellCheck } from './src/rules/SPELL.js';

const startTime = Date.now();

// Everything heavy runs in worker threads from the start; this thread only merges their results in a stable order.
const filesPaths = listFiles();
const ruleIds = listRuleIds();
const spellCheck = startSpellCheck(filesPaths);
const formatting = startPrettify(filesPaths);
const ruleResults = startRules(filesPaths, ruleIds);

const errorsByRule = await ruleResults;
errorsByRule.set('SPELL', await spellCheck);
applyFormatting(await formatting);

const errorsByPath = {};

for (const ruleId of ruleIds) {
  for (const error of errorsByRule.get(ruleId) ?? []) {
    errorsByPath[error.filePath] ??= [];
    errorsByPath[error.filePath].push({ ...error, type: ruleId });
  }
}

printReport(errorsByPath);

const elapsedSec = Math.ceil((Date.now() - startTime) / 1000);
log(`  🕓 Executed in ${elapsedSec} seconds`, 'comment');
