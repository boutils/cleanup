export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      for (const [lineIndex, line] of lines.entries()) {
        if ((line.includes('mdi-') || line.includes('mdil-')) && !line.includes('mdi-rotate')) {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'Remove hardcoded "mdi-"',
          });
        }
      }
    }

    return { errors };
  },
};
