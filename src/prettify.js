import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import * as prettier from 'prettier';
import { cacheDirectory } from './cache.js';
import { log } from './printReport.js';
import ignore from 'ignore';

const prettierOpts = JSON.parse(fs.readFileSync('.prettierrc', 'utf8'));
const ignorePatterns = fs.readFileSync('.prettierignore', 'utf8').split('\n').filter(Boolean);
const ig = ignore().add(ignorePatterns);

const CACHE_PATH = path.join(cacheDirectory('prettier'), 'formatted-hashes.json');

const logs = [];
export default async function prettify(index) {
  const filesPaths = Object.keys(index.byPath);
  const knownFormatted = readCache();
  const stillFormatted = new Set();

  for (const filePath of filesPaths) {
    if (ig.ignores(filePath) || filePath.endsWith('.ipynb')) {
      continue;
    }

    const content = index.byPath[filePath].content;
    const prettierOptions = { ...prettierOpts, filepath: filePath };
    const contentHash = hashOf(filePath, prettierOptions, content);

    if (knownFormatted.has(contentHash)) {
      stillFormatted.add(contentHash);
      continue;
    }

    const result = await prettier.format(content, prettierOptions);

    if (result !== content) {
      logs.push(`     - File has been formatted: '${filePath}'`);
      fs.writeFileSync(filePath, result, 'utf8');
    }

    stillFormatted.add(hashOf(filePath, prettierOptions, result));
  }

  writeCache(stillFormatted);

  if (logs.length > 0) {
    log('  ❌ Formatting errors:', 'error');
    for (const _log of logs) {
      log(_log, 'error');
    }
  } else {
    log('  ✅ Formatting ok', 'ok');
  }
}

// The hash covers everything that can change prettier's output, so a hit means "already formatted".
function hashOf(filePath, options, content) {
  return createHash('sha1')
    .update(prettier.version)
    .update('\0')
    .update(JSON.stringify(options))
    .update('\0')
    .update(filePath)
    .update('\0')
    .update(content)
    .digest('hex');
}

function readCache() {
  try {
    return new Set(JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')));
  } catch {
    return new Set();
  }
}

function writeCache(hashes) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify([...hashes]), 'utf8');
}
