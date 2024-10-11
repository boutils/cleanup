export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.hasMustacheCode) {
          if (!lineInfo.line.includes('{{ ')) {
            errors.push({
              filePath,
              line: lineInfo.lineNumber,
              message: "Missing space after '{{'",
            });
          } else if (!lineInfo.line.includes(' }}')) {
            errors.push({
              filePath,
              line: lineInfo.lineNumber,
              message: "Missing space before '{{'",
            });
          }
        }
      }
    }

    return { errors };
  },
};
