export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        const { line } = lineInfo;
        const hasSingleQuote = line.includes("'");

        if (hasSingleQuote) {
          const string = line.replace(/ /g, '');
          if (string.includes("='") && (line.match(/=/g) || []).length === 1) {
            errors.push({
              filePath,
              line: lineInfo.lineNumber,
              message: 'Use double quotes instead of single',
            });
          }
        }
      }
    }

    return { errors };
  },
};
