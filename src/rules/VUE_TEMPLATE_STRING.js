export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.attributeValue && lineInfo.attributeValue.includes("'") && lineInfo.attributeValue.includes('+')) {
          const arr = lineInfo.attributeValue.split('+');
          const templateStrArr = arr.map((it) => {
            const exp = it.trim();
            if (exp.startsWith("'")) {
              return exp.replace(/'/g, '');
            } else {
              return '${' + exp + '}';
            }
          });

          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: `Replace '${lineInfo.attributeValue}' by '\`${templateStrArr.join('')}\`' (template string)`,
          });
        }
      }
    }

    return { errors };
  },
};
