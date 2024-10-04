export default {
  validate: (index) => {
    // Check VMC & VUE files
    const filesPaths = index.byType['lib'].filter((it) => it.includes('.vmc.')).concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];
      for (const [lineIndex, line] of lines.entries()) {
        if (line.includes('$emit(')) {
          const str = line.substr(line.indexOf('$emit(') + 6);
          if (str[0] !== "'") {
            errors.push({
              filePath,
              line: lineIndex + 1,
              message: 'Use explicit $emit',
            });
          }
        }
      }
    }

    return { errors };
  },
};
