export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      let cummulatedAttributeNames = [];
      let cummulatedEventNames = [];
      for (const lineInfo of linesInfo) {
        const previousLineInfo = linesInfo[lineInfo.lineNumber - 2] || {};

        if (lineInfo.isCommentedLine) {
          continue;
        }

        if (!lineInfo.hasStartingTag || lineInfo.isCommentedLine) {
          cummulatedAttributeNames.push(...lineInfo.attributeNames);
        }

        if (
          ((cummulatedAttributeNames.length === 1 && cummulatedEventNames.length === 0) ||
            (cummulatedAttributeNames.length === 0 && cummulatedEventNames.length === 1)) &&
          lineInfo.hasEndingTag &&
          !lineInfo.hasStartingTag &&
          previousLineInfo.attributeNames.length === 0
        ) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: 'Attribute should be on the previous line',
          });
        }

        if (lineInfo.eventName) {
          cummulatedEventNames.push(lineInfo.eventName);
        }

        if (lineInfo.hasEndingTag) {
          cummulatedAttributeNames = [];
          cummulatedEventNames = [];
        }
      }
    }

    return { errors };
  },
};
