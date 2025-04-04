export default {
  validate: (index) => {
    const filesPaths = index.byType['json'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { content } = index.byPath[filePath];

      if (content.includes('"en":') && !filePath.endsWith('.i18n.json')) {
        errors.push({
          filePath,
          message: 'File contains i18n translations but is not named *.i18n.json',
        });
      }
    }

    return { errors };
  },
};
