import { parentPort, workerData } from 'node:worker_threads';
import { indexFiles } from './indexFiles.js';
import { getRules } from './listRules.js';
import { log } from './printReport.js';

const { filesPaths, ruleIds, primary } = workerData;

// Every worker indexes the same files: only the primary one writes the parse cache and echoes indexing warnings.
if (!primary) {
  console.log = () => {}; // eslint-disable-line no-console
  console.error = () => {}; // eslint-disable-line no-console
}

const [rules, index] = await Promise.all([getRules(ruleIds), indexFiles(filesPaths, { saveParseCache: primary })]);

const results = [];
for (const rule of rules) {
  if (!rule.validate) {
    log(`Rule '${rule.id}' is invalid and ignored`, 'error');
    continue;
  }

  const { errors } = await rule.validate(index);
  results.push([rule.id, errors]);
}

parentPort.postMessage(results);
