export default {
  validate: async (index) => {
    const errors = [];

    for (const { path: filePath, json } of index.stacks.list) {
      for (const key of ['center', 'top', 'bottom', 'left', 'right', 'footer']) {
        if (json.cards && json.cards[key] && json.cards[key].length === 0) {
          errors.push({
            filePath,
            line: undefined,
            message: `Stack has an empty cards '${key}' array, please remove it.`,
          });
        }
      }

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
