import { getCopyright } from '../utils.js';

const COPYRIGHT = getCopyright();

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'].filter((it) => !it.includes('jupyter-ext-minimal-ui/'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];
      const firstLine = lines[0];
      const secondLine = lines[1];
      if (firstLine && String(firstLine).trim() !== String(COPYRIGHT).trim()) {
        errors.push({
          filePath,
          line: 1,
          message: 'Missing or invalid copyright',
        });
      }

      if (secondLine !== '') {
        errors.push({
          filePath,
          line: 2,
          message: 'Add an empty line after copyright',
        });
      }
    }

    return { errors };
  },
};
