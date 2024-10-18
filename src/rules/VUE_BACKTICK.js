export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        const { line } = lineInfo;

        if (!lineInfo.hasBackTick) {
          continue;
        }

        if (!lineInfo.hasDollar && !lineInfo.hasPipe) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: 'BackTick should be removed, there is no variable inside',
          });

          continue;
        }

        if (!lineInfo.isVueBinding && !lineInfo.hasMustacheCode) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: 'BackTick should be removed, this is not a vue binding',
          });

          continue;
        }

        if (
          !line.includes('${') ||
          (line.includes('`${') && line.includes('}`') && (line.match(/{/g) || []).length === 1)
        ) {
          const singleQuotePos = line.indexOf("'");
          if ((singleQuotePos > -1 && singleQuotePos < line.indexOf('`')) || (line.match(/`/g) || []).length === 1) {
            continue;
          }

          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: 'BackTick should be removed',
          });
        }
      }
    }

    return { errors };
  },
};
