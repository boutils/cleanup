export default {
  validate: (index) => {
    const filesPaths = Object.keys(index.byPath).filter((it) => !it.includes('jupyter-ext-minimal-ui/'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { content, lines } = index.byPath[filePath];
      const isEmptySpec = content.replaceAll('\n', '').replaceAll(' ', '') === `{"hello":{"en":""}}`;

      if (!content || isEmptySpec || (lines.length <= 2 && lines[0].includes('//'))) {
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
