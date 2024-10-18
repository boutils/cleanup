export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.line.includes(':class') && lineInfo.line.includes('"{')) {
          if (!lineInfo.line.includes('"{ ') || !lineInfo.line.includes(' }')) {
            errors.push({
              filePath,
              line: lineInfo.lineNumber,
              message: `Add 'space' after '{'  and before '}' in dynamic class.`,
            });
          }

          if (lineInfo.line.trim().includes(' : ')) {
            errors.push({
              filePath,
              line: lineInfo.lineNumber,
              message: `Remove 'space' before ':' in dynamic class.`,
            });
          }
        }
      }
    }

    return { errors };
  },
};
