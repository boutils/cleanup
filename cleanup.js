import { indexFiles } from './src/indexFiles.js';
import { getRules } from './src/listRules.js';
import prettify from './src/prettify.js';
import { log, printReport } from './src/printReport.js';

const rules = await getRules();
const index = await indexFiles();

await prettify(index);

/*
addWarning(filePath, fnIndex + 1, "ASYNC", `Add 'async' here`);
addWarning( filePath, asyncFnLineIndex + 1, "ASYNC", `Remove 'async'` );
*/

const errorsByPath = {};

for (const rule of rules) {
  if (!rule.validate) {
    log(`Rule '${rule.id}' is invalid and ignored`, 'error');
    continue;
  }

  const result = rule.validate(index);

  for (const error of result.errors) {
    errorsByPath[error.filePath] ??= [];
    errorsByPath[error.filePath].push({ ...error, type: rule.id });
  }
}

printReport(errorsByPath);
