export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];
    for (const filePath of filesPaths) {
      if (!filePath.includes('src/libs/') || filePath.split('/').length > 3) {
        continue;
      }

      const { imports } = index.byPath[filePath];

      const locations = imports.values.map((it) => {
        const substr = it.line.includes(' from ') ? ' from ' : 'import ';
        const path = it.line.split(substr)[1].replace(/'/g, '').replace(/;/g, '');
        const hasType = it.line.includes('import type') ? 'type___' : '';
        return hasType + path;
      });

      for (const location of locations) {
        if (location.startsWith('./')) {
          errors.push({
            filePath,
            line: imports.values.findLast((it) => it.line.includes(location))?.lineNumber,
            message: `Import "${location}" should use '@/libs/''`,
          });
        }
      }
    }

    return { errors };
  },
};
