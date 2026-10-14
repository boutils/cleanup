import fs from 'node:fs';
import path from 'node:path';

// One cache tree per linted project, under this repo's node_modules so git never sees it.
export function cacheDirectory(name) {
  const directory = path.join(
    import.meta.dirname,
    '..',
    'node_modules',
    '.cache',
    'cleanup',
    path.basename(process.cwd()),
    name
  );
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}
