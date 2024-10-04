import { getSortingError } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'].filter((it) => it.includes('.vmc.'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { emits } = index.byPath[filePath].vmc;
      const sortingError = getSortingError(emits.values);

      if (sortingError) {
        errors.push({
          filePath,
          line: emits.lineIndex + 1,
          message: `EMIT ${sortingError}`,
        });
      }
    }

    return { errors };
  },
};
