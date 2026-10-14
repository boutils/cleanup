import * as fs from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { cacheDirectory } from './cache.js';
import { listTestFiles } from './indexFiles.js';
import { log } from './printReport.js';
import ignore from 'ignore';

const WORKERS = 4;
const prettierOpts = JSON.parse(fs.readFileSync('.prettierrc', 'utf8'));
const ignorePatterns = fs.readFileSync('.prettierignore', 'utf8').split('\n').filter(Boolean);
const ig = ignore().add(ignorePatterns);

const CACHE_PATH = path.join(cacheDirectory('prettier'), 'formatted-hashes.json');

// Workers read, hash and format their share of the files; a file whose hash is in the cache is already formatted.
// Formatted text comes back here and is written by applyFormatting, once the rule workers are done reading.
export async function startPrettify(filesPaths) {
  const paths = [...listTestFiles(), ...filesPaths].filter((it) => !ig.ignores(it) && !it.endsWith('.ipynb'));
  const knownHashes = readCache();
  const shards = Array.from({ length: WORKERS }, (_, i) => paths.filter((_, j) => j % WORKERS === i));

  const results = await Promise.all(shards.map((shardPaths) => formatInWorker(shardPaths, knownHashes)));
  const byPath = new Map(results.flat().map((it) => [it.filePath, it]));

  return paths.map((filePath) => byPath.get(filePath));
}

export function applyFormatting(results) {
  const logs = [];

  for (const { filePath, formatted } of results) {
    if (formatted !== null) {
      logs.push(`     - File has been formatted: '${filePath}'`);
      fs.writeFileSync(filePath, formatted, 'utf8');
    }
  }

  writeCache(results.map((it) => it.hash));

  if (logs.length > 0) {
    log('  ❌ Formatting errors:', 'error');
    for (const _log of logs) {
      log(_log, 'error');
    }
  } else {
    log('  ✅ Formatting ok', 'ok');
  }
}

function formatInWorker(filePaths, knownHashes) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./prettierWorker.js', import.meta.url), {
      workerData: { filePaths, knownHashes, prettierOpts },
    });
    worker.once('message', resolve);
    worker.once('error', reject);
  });
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeCache(hashes) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(hashes), 'utf8');
}
