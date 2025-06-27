export default {
  validate: (index) => {
    const { vars, path } = index.theme;

    const dynamicVars = computeDynamicVars(index.allContent);

    const errors = [];
    const indexExistingVars = index.theme.vars
      .map((it) => it.key.replaceAll('$', ''))
      .reduce((acc, it) => {
        acc[it] = true;
        return acc;
      }, {});

    for (const themeVar of vars) {
      const varName = themeVar.key.replaceAll('$', '');
      if (!index.allContent.includes(varName) && !dynamicVars.find((it) => varName.includes(it))) {
        const varPath = varName
          .split(/(?=[A-Z])/)
          .map((it) => it[0].toLowerCase() + it.slice(1))
          .reverse()
          .join('.');

        errors.push({
          filePath: path,
          message: `Remove '${varName}' at '${varPath}'. It is not used.`,
        });
      }
    }

    const themeVarsInCss = getThemeVarsInCss(index.allContent);

    for (const themeVar of themeVarsInCss) {
      if (!indexExistingVars[themeVar]) {
        errors.push({
          filePath: `unknown (search for '--v-theme-${themeVar}' in files)`,
          message: `Remove '--v-theme-${themeVar}' at '${themeVar}'. It is not used.`,
        });
      }
    }
    return { errors };
  },
};

const searchText = 'getThemeColor(`';
function computeDynamicVars(allContent) {
  const dynamicVars = [];
  while (allContent.includes(searchText)) {
    const startIndex = allContent.indexOf(searchText);
    const endIndex = allContent.indexOf(')', startIndex);
    if (endIndex === -1) {
      break; // No closing parenthesis found
    }

    const dynamicVarStr = allContent.slice(startIndex + searchText.length, endIndex).trim();
    if (dynamicVarStr) {
      const dynamicVar = dynamicVarStr
        .substr(dynamicVarStr.lastIndexOf('}') + 1)
        .replaceAll('`', '')
        .trim();

      if (dynamicVar) {
        dynamicVars.push(dynamicVar);
      }
    }

    allContent = allContent.slice(endIndex + 1);
  }

  return dynamicVars;
}

function getThemeVarsInCss(allContent) {
  const themeVarsInCss = [];
  const regex = /--v-theme-[\w-]+/g;

  let match;
  while ((match = regex.exec(allContent)) !== null) {
    const themeVar = match[0];

    allContent = allContent.replaceAll(match[0], '');
    if (!themeVarsInCss.includes(themeVar)) {
      themeVarsInCss.push(themeVar.replace('--v-theme-', ''));
    }
  }

  return themeVarsInCss;
}
