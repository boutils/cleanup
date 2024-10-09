export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        const previousLineInfo = linesInfo[lineInfo.lineNumber - 2] || {};

        const cd1 = lineInfo.isEmptyLine && previousLineInfo.isEmptyLine;
        const cd2 =
          lineInfo.hasEndingTag &&
          !lineInfo.hasStartingTag &&
          !lineInfo.isCommentedLine &&
          previousLineInfo.isEmptyLine;

        if (cd1 || cd2) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber - 1,
            message: 'Remove this empty line',
          });
        }
      }
    }

    return { errors };
  },
};
