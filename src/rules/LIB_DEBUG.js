export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'].filter((it) => !it.includes('jupyter-ext-minimal-ui/'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      for (const [lineIndex, line] of lines.entries()) {
        if (line.trim().includes('debug.enabled = true;')) {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'DEBUG should be removed',
          });
        }
      }
    }

    return { errors };
  },
};
