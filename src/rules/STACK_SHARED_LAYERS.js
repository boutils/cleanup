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

      let allJsonString = '';
      for (const { json } of index.stacks.list) {
        const string = JSON.stringify(json);
        allJsonString += string.replace(/\s/g, '');
      }

      for (const layerId of keys) {
        if (allJsonString.includes(`"id":"${layerId}"`)) {
          continue;
        }

        errors.push({
          filePath: index.stacks.spec.path,
          line: index.stacks.spec.json.layers[layerId].line,
          message: `Layer "${layerId}" is defined in shared layers but not used in any card.`,
        });
      }
    }

    return { errors };
  },
};
