export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'].filter(
      (it) => !it.includes('jupyter-ext-minimal-ui/') && !it.endsWith('.js')
    );

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      for (const [lineIndex, line] of lines.entries()) {
        const trimmedLine = line?.trim();
        const nextLineInfo = lines[lineIndex + 1] || {};

        if (
          line.length > 0 &&
          trimmedLine === '}' &&
          nextLineInfo?.length > 0 &&
          !nextLineInfo.trim().startsWith('}') &&
          !nextLineInfo.trim().startsWith('break;') &&
          !nextLineInfo.trim().startsWith('else') &&
          !nextLineInfo.trim().startsWith(']')
        ) {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'Add an empty line',
          });
        }
      }
    }

    return { errors };
  },
};
