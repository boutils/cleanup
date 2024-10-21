export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];

    for (const filePath of filesPaths) {
      const { functions, content, lines } = index.byPath[filePath];

      if (content.includes('MARK:')) {
        continue;
      }

      let hasPrivateFns = false;
      for (const fn of functions) {
        if (!fn.isExported) {
          hasPrivateFns = true;
        }

        if (fn.isExported && hasPrivateFns) {
          const lineIndex = lines.findIndex((it) => it.includes(`function ${fn.name}`));
          errors.push({
            filePath,
            line: lineIndex > -1 ? lineIndex + 1 : null,
            message: `'${fn.name}' is exported and should be before private functions`,
          });
        }
      }
    }

    return { errors };
  },
};
