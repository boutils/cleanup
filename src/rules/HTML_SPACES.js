export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.attributeNames.length > 0) {
          if (lineInfo.hasStartingTag && lineInfo.line.lastIndexOf('  ') > lineInfo.line.indexOf('<')) {
            errors.push({
              filePath,
              line: lineInfo.lineNumber,
              message: 'Too much spaces',
            });
          }
        }
      }
    }

    return { errors };
  },
};
