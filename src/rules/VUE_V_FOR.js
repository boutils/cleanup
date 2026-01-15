export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.isInsideVFor && lineInfo.line.includes('prefix-id') && !lineInfo.attributeValue.startsWith('`')) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: 'Inside v-for, "prefix-id" should use backticks to allow dynamic IDs.',
          });
        }
      }
    }

    return { errors };
  },
};
