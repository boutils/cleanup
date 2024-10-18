export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        const previousLineInfo = linesInfo[lineInfo.lineNumber - 2] || {};

        if (lineInfo.attributeNames.length > 0 && previousLineInfo.eventName && !previousLineInfo.hasEndingTag) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber - 1,
            message: `'${previousLineInfo.eventName}' should be declared after attributes`,
          });
        }
      }
    }

    return { errors };
  },
};
