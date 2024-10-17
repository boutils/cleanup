import { findDuplicates } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { imports } = index.byPath[filePath];

      const locations = imports.map((it) => {
        const path = it.line.split(' from ')[1].replace(/'/g, '').replace(/;/g, '');
        const hasType = it.line.includes('import type') ? 'type___' : '';
        return hasType + path;
      });

      for (const duplicate of findDuplicates(locations)) {
        errors.push({
          filePath,
          line: imports.findLast((it) => it.line.includes(duplicate))?.lineNumber,
          message: `Import "${duplicate}" is duplicated'`,
        });
      }
    }

    return { errors };
  },
};
