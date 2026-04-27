import { getSortingError } from '../utils.js';

export default {
  validate: async (index) => {
    const errors = [];

    if (index.stacks.spec.json.layers) {
      const keys = Object.keys(index.stacks.spec.json.layers);
      const sortingErrors = getSortingError(keys);
      if (sortingErrors) {
        errors.push({
          filePath: index.stacks.spec.path,
          line: sortingErrors.lineNumber,
          message: `Layer ${sortingErrors}`,
        });
      }
    }

    return { errors };
  },
};
