import * as fs from 'node:fs';
import { getCopyright } from './utils.js';
import { log } from './printReport.js';

const COPYRIGHT = getCopyright();
const path = 'libs/typescript/components/';
const ignorePath = `${path}shared/`;
const fileImport = 'apps/office/stoic-imports.ts';

const logs = [];
export default async function prettify(index) {
  const imports = [];

  // Import all VMC & CSS components files
  let lastComponentName = '';
  for (const filePath of index.byType.vmc.concat(index.byType.style).sort()) {
    if (!filePath.startsWith(path) || filePath.startsWith(ignorePath)) {
      continue;
    }

    const componentName = filePath.split('/').pop().split('.')[0];

    if (lastComponentName !== componentName) {
      imports.push('');
      imports.push('// ' + componentName);
    }

    const importPath = filePath.replace('libs/typescript/', '@libs/');
    const importPathWithoutExtension = importPath.replace('.ts', '');
    imports.push(`import '${importPathWithoutExtension}';`);

    lastComponentName = componentName;
  }

  const newContent = [COPYRIGHT, ...imports, ''].join('\n');
  const content = fs.readFileSync(fileImport, 'utf8');

  if (newContent !== content) {
    logs.push(`     - Imports have been updated: '${fileImport}'`);
    fs.writeFileSync(fileImport, newContent, 'utf8');
  }

  if (logs.length > 0) {
    log('  ❌ Imports are obsolete:', 'error');
    for (const _log of logs) {
      log(_log, 'error');
    }
  } else {
    log('  ✅ Imports ok', 'ok');
  }
}
