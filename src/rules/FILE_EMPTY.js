export default {
  validate: (index) => {
    const filesPaths = Object.keys(index.byPath).filter((it) => !it.includes('jupyter-ext-minimal-ui/'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { content, lines } = index.byPath[filePath];

      if (!content || (lines.length <= 2 && lines[0].includes('//'))) {
        errors.push({
          filePath,
          line: null,
          message: 'Remove this empty file',
        });
      }
    }

    return { errors };
  },
};
