export default {
  validate: (index) => {
    const filesPaths = index.byType['style'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { content } = index.byPath[filePath];

      let isInside = false;
      const lines = content.split('\n');
      for (const [i, line] of lines.entries()) {
        const previousLine = lines[i - 1];
        const nextLine = lines[i + 1];
        if (
          line.trim() === '' &&
          !previousLine?.includes('--') &&
          isInside &&
          nextLine &&
          !nextLine?.includes('{') &&
          !nextLine?.includes(',')
        ) {
          errors.push({
            filePath: filePath,
            line: i + 1,
            message: `Remove this empty line`,
          });
        }

        if (line.includes('{') && !line.includes('}')) {
          isInside = true;
        } else if (line.includes('}')) {
          isInside = false;
        }
      }
    }

    return { errors };
  },
};
