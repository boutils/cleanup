export default {
  validate: async (index) => {
    const stacksFilePath = index.stacks.spec.path;
    const stacksColor = index.stacks.spec.json.theme.colors || {};
    const errors = [];

    const indexExistingVars = index.theme.vars
      .map((it) => it.key.replaceAll('$', ''))
      .reduce((acc, it) => {
        acc[it] = true;
        return acc;
      }, {});

    // Compute a text with all stacks JSON
    let stacksText = JSON.stringify(index.stacks.spec.json);
    for (const stack of index.stacks.list) {
      const content = JSON.stringify(stack.json);
      stacksText += content;
    }

    for (const [colorName, colorValue] of Object.entries(stacksColor)) {
      // Check colors validity (should be a hex code)
      for (const theme of ['light', 'dark']) {
        const color = colorValue[theme];
        if (
          !color ||
          typeof color !== 'string' ||
          !color.startsWith('#') ||
          (color.length !== 7 && color.length !== 4)
        ) {
          errors.push({
            filePath: stacksFilePath,
            line: undefined,
            message: `Color '${colorName}' is invalid (not a valid hex code) for theme '${theme}'`,
          });
        }
      }

      // Check colors are used in stacks.json
      const colorId = 'theme.colors.' + colorName;
      if (!stacksText.includes(colorId)) {
        errors.push({
          filePath: stacksFilePath,
          line: undefined,
          message: `Color '${colorName}' is not used in any stack (should be referenced as '${colorId}'), please remove.`,
        });
      }
    }

    // Check that all colors referenced exist in stacks.json
    const colorReferencesRegex = /theme\.colors\.[a-zA-Z0-9_-]+/g;
    const colorReferences = stacksText.match(colorReferencesRegex) || [];
    for (const colorReference of colorReferences) {
      const colorName = colorReference.replace('theme.colors.', '');
      if (!stacksColor[colorName] && !indexExistingVars[colorName]) {
        errors.push({
          filePath: stacksFilePath,
          line: undefined,
          message: `Color '${colorName}' is referenced in stacks.json but not defined in theme.colors (stacks.json), please add it.`,
        });
      }
    }

    return { errors };
  },
};
