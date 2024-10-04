export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.line.endsWith(' ')) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: `Remove trailing spaces`,
          });
        }
      }
    }

    return { errors };
  },
};
