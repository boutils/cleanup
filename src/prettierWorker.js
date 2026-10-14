import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';
import * as prettier from 'prettier';

const { filePaths, knownHashes, prettierOpts } = workerData;
const known = new Set(knownHashes);
const results = [];

for (const filePath of filePaths) {
  const content = fs.readFileSync(filePath, 'utf8');
  const options = { ...prettierOpts, filepath: filePath };
  const hash = hashOf(options, content);

  if (known.has(hash)) {
    results.push({ filePath, formatted: null, hash });
    continue;
  }

  const formatted = await prettier.format(content, options);
  results.push(
    formatted === content
      ? { filePath, formatted: null, hash }
      : { filePath, formatted, hash: hashOf(options, formatted) }
  );
}

parentPort.postMessage(results);

// The hash covers everything that can change prettier's output, so a hit means "already formatted".
function hashOf(options, content) {
  return createHash('sha1')
    .update(prettier.version)
    .update('\0')
    .update(JSON.stringify(options))
    .update('\0')
    .update(content)
    .digest('hex');
}
