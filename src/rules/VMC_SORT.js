import { getSortingError } from '../utils.js';

const SORTED_PROPERTIES = ['props', 'data', 'computed', 'methods', 'watch'];

export default {
  validate: (index) => {
    // Check VMC files
    const filesPaths = index.byType['lib'].filter((it) => it.includes('.vmc.'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { vmc } = index.byPath[filePath];

      for (const propertyType of SORTED_PROPERTIES) {
        const names = vmc[propertyType].map((it) => it.name.replace(/-/g, ''));
        const sortingErrors = getSortingError(names);
        if (sortingErrors) {
          errors.push({
            filePath,
            line: sortingErrors.lineNumber,
            message: `${propertyType} ${sortingErrors}`,
          });
        }
      }
    }

    return { errors };
  },
};
