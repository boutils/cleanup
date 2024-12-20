import { getSortingError } from '../utils.js';

const SORTED_PROPERTIES = ['props', 'data', 'computed', 'methods', 'watch'];

export default {
  validate: (index) => {
    // Check VMC files
    const filesPaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { vmc, content } = index.byPath[filePath];

      const hasMark = content.includes('MARK: ');
      for (const propertyType of SORTED_PROPERTIES) {
        if (propertyType === 'methods' && hasMark) {
          // With sections (Marks): methods are not sorted
          continue;
        }

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
