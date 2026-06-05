export default {
  validate: async (index) => {
    const errors = [];

    if (index.stacks.notebooks) {
      for (const notebook of index.stacks.notebooks) {
        const cellParameters = index.byPath[notebook.name]?.json.cells.find((cell) =>
          cell.metadata?.tags?.includes('parameters')
        );
        if (!cellParameters) {
          errors.push({
            filePath: notebook.path,
            line: undefined,
            message: `'No parameters cell found in notebook '${notebook.name}'.`,
          });
          continue;
        }

        // if (cellParameters.source && JSON.stringify(cellParameters.source).match(/#[0-9a-fA-F]{3,6}/g)) {
        //   console.log(
        //     notebook.name,
        //     'There is a hardcoded hex color in parameters cell, please use theme.colors instead.'
        //   );
        // }

        //console.log(notebook.name, cellParameters.source); // eslint-disable-line no-console --- IGNORE ---
      }
    }

    return { errors };
  },
};
