export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.line.includes('!==')) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: 'Remove "!==" and move logic in VMC file',
          });
        }

        if (lineInfo.line.includes('===')) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: 'Remove "===" and move logic in VMC file',
          });
        }
      }
    }

    return { errors };
  },
};
