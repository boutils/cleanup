export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      for (const [lineIndex, line] of lines.entries()) {
        if (line.includes('this.')) {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'Remove "this."',
          });
        }
      }
    }

    return { errors };
  },
};
