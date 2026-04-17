export default {
  validate: async (index) => {
    const errors = [];

    for (const { path: filePath, json } of index.stacks.list) {
      if (json.annotations) {
        if (Object.keys(json.annotations).length === 0) {
          errors.push({
            filePath,
            line: undefined,
            message: `Stack has an empty 'annotations' object, please remove it.`,
          });
        }

        for (const key of ['events', 'thresholds', 'periods']) {
          if (json.annotations[key] && Object.keys(json.annotations[key]).length === 0) {
            errors.push({
              filePath,
              line: undefined,
              message: `Stack has an empty '${key}' object in 'annotations', please remove it.`,
            });
          }
        }
      }
    }

    return { errors };
  },
};
