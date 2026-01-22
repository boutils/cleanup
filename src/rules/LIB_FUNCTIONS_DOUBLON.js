export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];

    const allFunctions = {};
    for (const filePath of filesPaths) {
      const { functions } = index.byPath[filePath];

      for (const fn of functions) {
        const fnId = `${fn.name}(${fn.parameters.length})`;
        allFunctions[fnId] = allFunctions[fnId] || [];
        allFunctions[fnId].push({ filePath, fn });
      }
    }

    for (const fnId of Object.keys(allFunctions)) {
      if (allFunctions[fnId].length > 1) {
        const firstOccurrence = allFunctions[fnId][0];
        const result = [];
        for (const occurrence of allFunctions[fnId]) {
          const params = [];
          for (const param of occurrence.fn.parameters) {
            params.push(param.type);
          }

          result.push(params.join(','));
        }

        const doublons = [];
        for (const res of result.slice(1)) {
          if (res === result[0]) {
            doublons.push(res);
          }
        }

        const fnName = firstOccurrence.fn.name;
        if (doublons.length === 0 || fnName === 'main') {
          continue;
        }

        errors.push({
          filePath: firstOccurrence.filePath,
          line: firstOccurrence.fn.line,
          message: `Function name '${firstOccurrence.fn.name}' is duplicated in multiple files.`,
        });
      }
    }

    return { errors };
  },
};
