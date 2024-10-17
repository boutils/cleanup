export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { imports, lines } = index.byPath[filePath];

      if (imports.info.lastLineNumberOfImport > 0 && lines[imports.info.lastLineNumberOfImport] !== '') {
        errors.push({
          filePath,
          line: imports.info.lastLineNumberOfImport,
          message: 'Add an empty line',
        });
      }
    }

    return { errors };
  },
};
