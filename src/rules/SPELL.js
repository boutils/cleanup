import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { cacheDirectory } from '../cache.js';

const SHARDS = 4;
const config = new URL('../../cspell/cspell.json', import.meta.url).pathname;
const cacheDir = cacheDirectory('cspell');

let pending = null;

export default {
  validate: async (index) => ({ errors: await (pending ?? startSpellCheck(index.allFiles)) }),
};

// cspell is the slowest rule and depends on nothing but the file list, so it runs in worker threads from the moment
// the list is known and overlaps with indexing, prettier and every other rule.
export function startSpellCheck(allFiles) {
  const filePaths = allFiles.filter((filePath) => !filePath.endsWith('.ipynb'));
  const shards = Array.from({ length: SHARDS }, () => []);
  for (const filePath of filePaths) {
    shards[shardOf(filePath)].push(filePath);
  }

  const orderByPath = new Map(filePaths.map((filePath, i) => [path.resolve(filePath), i]));

  pending = Promise.all(shards.map((shardPaths, i) => (shardPaths.length > 0 ? lintInWorker(shardPaths, i) : []))).then(
    (results) => results.flat().sort((a, b) => orderOf(a) - orderOf(b))
  );

  return pending;

  function orderOf(error) {
    return orderByPath.get(path.resolve(error.filePath)) ?? Number.MAX_SAFE_INTEGER;
  }
}

function lintInWorker(filePaths, shard) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../spellWorker.js', import.meta.url), {
      workerData: { filePaths, config, cacheLocation: path.join(cacheDir, `.cspellcache-${shard}`) },
    });
    worker.once('message', resolve);
    worker.once('error', reject);
  });
}

// Stable assignment so a file always hits the same shard's cache, whatever gets added around it.
function shardOf(filePath) {
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    hash = (hash * 31 + filePath.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % SHARDS;
}
