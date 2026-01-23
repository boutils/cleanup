export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { imports, lines } = index.byPath[filePath];

      let lineNumber = 2;
      for (const _import of imports.values) {
        if (
          _import.lineNumber !== lineNumber + 1 &&
          lines[lineNumber] === '' &&
          !lines[lineNumber + 1].startsWith('//')
        ) {
          errors.push({
            filePath,
            line: lineNumber + 1,
            message: 'Remove this empty line',
          });

          break;
        }

        lineNumber++;
      }
    }

    return { errors };
  },
};
