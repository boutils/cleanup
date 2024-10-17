export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        const previousLineInfo = linesInfo[lineInfo.lineNumber - 2] || {};

        if (
          !lineInfo.isEmptyLine &&
          lineInfo.hasStartingTag &&
          !previousLineInfo.allowMultipleTags &&
          !lineInfo.isClosingTag &&
          lineInfo.lineNumber - 1 > 0 &&
          previousLineInfo.hasEndingTag
        ) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: 'Add an empty line before',
          });
        }
      }
    }

    return { errors };
  },
};
