const IGNORED = ['apps/office/src/actions/action-generate-presentation.ts__generatePresentation'];

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];

    for (const filePath of filesPaths) {
      const { functions, content, lines } = index.byPath[filePath];

      for (const fn of functions) {
        if (!fn.isAsync) {
          continue;
        }

        const definitionStr = content.substr(fn.start, fn.end - fn.start);

        if (
          !definitionStr.includes('await ') &&
          !definitionStr.includes('Promise') &&
          !IGNORED.includes(`${filePath}__${fn.name}`)
        ) {
          const lineIndex = lines.findIndex((it) => it.includes(`function ${fn.name}(`));
          errors.push({
            filePath,
            line: lineIndex > -1 ? lineIndex + 1 : null,
            message: `'${fn.name}': remove async`,
          });
        }
      }
    }

    return { errors };
  },
};
