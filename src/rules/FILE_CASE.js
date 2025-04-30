import { kebabize } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = Object.keys(index.byPath).filter((it) => !it.includes('jupyter-ext-minimal-ui/'));

    const errors = [];
    for (const filePath of filesPaths) {
      if (/[A-Z]/.test(filePath)) {
        errors.push({
          filePath,
          line: null,
          message: `Path contains upper case, it should be rename "${kebabize(filePath)}"`,
        });
      }
    }

    return { errors };
  },
};
