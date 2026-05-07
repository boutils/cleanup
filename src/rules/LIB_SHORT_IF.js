const ignoredFiles = [];

const keywords = ['return', 'continue', 'break', 'throw', 'yield'];

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'].concat(index.byType['vmc']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      if (ignoredFiles.includes(filePath)) {
        continue;
      }

      for (const [lineIndex, line] of lines.entries()) {
        for (const keyword of keywords) {
          if (line.includes(`) ${keyword}`)) {
            errors.push({
              filePath,
              line: lineIndex + 1,
              message: `Replace line by "${line.trim().replace(`) ${keyword}`, `) { ${keyword}`)} }" and add an empty line after the "${keyword}".`,
            });
          }
        }
      }
    }

    return { errors };
  },
};
