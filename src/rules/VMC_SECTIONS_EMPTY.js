import { VMC_SECTIONS } from '../utils.js';

const EMPTY_SECTION_TO_REMOVE = VMC_SECTIONS.map((it) => it.name + it.emptySuffix);

export default {
  validate: (index) => {
    const filePaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filePaths) {
      const { lines } = index.byPath[filePath];

      for (const [lineIndex, line] of lines.entries()) {
        const trimmedLine = line.trim();

        if (EMPTY_SECTION_TO_REMOVE.includes(trimmedLine) && trimmedLine !== "name: '',") {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'Remove this section (line empty)',
          });
        }
      }
    }

    return { errors };
  },
};
