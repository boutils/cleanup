import * as fs from 'node:fs';
import * as prettier from 'prettier';
import { log } from './printReport.js';
import ignore from 'ignore';

const prettierOpts = JSON.parse(fs.readFileSync('.prettierrc.json', 'utf8'));
const ignorePatterns = fs.readFileSync('.prettierignore', 'utf8').split('\n').filter(Boolean);
const ig = ignore().add(ignorePatterns);

const logs = [];
export default async function prettify(index) {
  const filesPaths = Object.keys(index.byPath);

  for (const filePath of filesPaths) {
    if (ig.ignores(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const prettierOptions = { ...prettierOpts, filepath: filePath };
    const result = await prettier.format(content, prettierOptions);

    if (result !== content) {
      logs.push(`     - File has been formatted: '${filePath}'`);
      fs.writeFileSync(filePath, result, 'utf8');
    }
  }

  if (logs.length > 0) {
    log('  ❌ Formatting errors:', 'error');
    for (const _log of logs) {
      log(_log, 'error');
    }
  } else {
    log('  ✅ Formatting ok', 'ok');
  }
}
