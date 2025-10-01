const ignoredFiles = ['src/theme/colors.ts'];

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'].concat(index.byType['vmc']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      if (ignoredFiles.includes(filePath)) {
        continue;
      }

      for (const [lineIndex, line] of lines.entries()) {
        const hexColorRegex = /'#[0-9a-fA-F]{3,8}'/;
        if (hexColorRegex.test(line)) {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'Found Hardcoded color. Use variable from theme instead.',
          });
        }
      }
    }

    return { errors };
  },
};
