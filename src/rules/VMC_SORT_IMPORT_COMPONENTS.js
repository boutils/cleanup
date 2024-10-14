import { getSortingError } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'].filter((it) => it.includes('.vmc.'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { vmc } = index.byPath[filePath];
      const sortingErrors = getSortingError(vmc.components.values);
      if (sortingErrors) {
        errors.push({
          filePath,
          line: vmc.components.lineIndex + 1,
          message: `Components sorting error: ${sortingErrors}`,
        });
      }
    }

    return { errors };
  },
};
