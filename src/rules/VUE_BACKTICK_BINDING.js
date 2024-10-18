export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.hasBackTick && !lineInfo.isVueBinding && !lineInfo.hasMustacheCode) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: 'BackTick should be removed, this is not a vue binding',
          });
        }
      }
    }

    return { errors };
  },
};
