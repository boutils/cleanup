import { VMC_SECTIONS } from '../utils.js';

const SECTIONS = VMC_SECTIONS.map((it) => it.name + it.suffix);

export default {
  validate: (index) => {
    const filePaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filePaths) {
      const { lines } = index.byPath[filePath];

      for (const [lineIndex, line] of lines.entries()) {
        const trimmedLine = line.trim();

        const trimmedPreviousLine = lines[lineIndex - 1]?.trim();
        if (
          SECTIONS.includes(trimmedLine) &&
          lineIndex > 0 &&
          trimmedPreviousLine !== '' &&
          !trimmedPreviousLine.startsWith('//')
        ) {
          errors.push({
            filePath,
            line: lineIndex,
            message: 'Add an empty line before this section',
          });
        }
      }
    }

    return { errors };
  },
};
