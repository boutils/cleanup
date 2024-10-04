export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (
          (lineInfo.eventName || lineInfo.attributeNames.length > 0) &&
          lineInfo.equalPosition > -1 &&
          !lineInfo.line.includes(' = ')
        ) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: `'=' should be surronded by at least one space`,
          });
        }
      }
    }

    return { errors };
  },
};
