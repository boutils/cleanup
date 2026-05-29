import { indexFiles } from './src/indexFiles.js';
import { getRules } from './src/listRules.js';
import prettify from './src/prettify.js';
import { log, printReport } from './src/printReport.js';

const startTime = Date.now();

const rules = await getRules();
const index = await indexFiles();

await prettify(index);

const errorsByPath = {};

for (const rule of rules) {
  if (!rule.validate) {
    log(`Rule '${rule.id}' is invalid and ignored`, 'error');
    continue;
  }

  const result = await rule.validate(index);

  for (const error of result.errors) {
    errorsByPath[error.filePath] ??= [];
    errorsByPath[error.filePath].push({ ...error, type: rule.id });
  }
}

printReport(errorsByPath);

const elapsedSec = Math.ceil((Date.now() - startTime) / 1000);
log(`  🕓 Executed in ${elapsedSec} seconds`, 'comment');
