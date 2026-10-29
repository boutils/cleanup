const IGNORED = ['--v-theme-background', '--v-theme-primary', '--v-theme-error'];
const IGNORED_VARS = ['falseBooleanColor'];

export default {
  appliesTo: (index) => Boolean(index.theme.path),

  validate: (index) => {
    const { vars, path } = index.theme;

    const dynamicVars = computeDynamicVars(index.allContent);
    const isMentioned = buildSubstringLookup(index.allContent);

    const errors = [];
    const indexExistingVars = index.theme.vars
      .map((it) => it.key.replaceAll('$', ''))
      .reduce((acc, it) => {
        acc[it] = true;
        return acc;
      }, {});

    for (const themeVar of vars) {
      const varName = themeVar.key.replaceAll('$', '');
      if (!isMentioned(varName) && !dynamicVars.find((it) => varName.includes(it)) && !IGNORED_VARS.includes(varName)) {
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
      if (!indexExistingVars[themeVar] && !IGNORED.includes(`--v-theme-${themeVar}`)) {
        errors.push({
          filePath: `unknown (search for '--v-theme-${themeVar}' in files)`,
          message: `Remove '--v-theme-${themeVar}' at '${themeVar}'. It is not used.`,
        });
      }
    }
    return { errors };
  },
};

// Equivalent to `allContent.includes(name)` for names made of [A-Za-z0-9_-]: such a substring always sits inside one
// maximal run of those characters, so checking the unique runs replaces a full scan of the 13 MB content per name.
function buildSubstringLookup(allContent) {
  const tokens = new Set(allContent.match(/[A-Za-z0-9_-]+/g));
  const joinedTokens = [...tokens].join('\n');

  return (name) => {
    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      return allContent.includes(name);
    }

    return tokens.has(name) || joinedTokens.includes(name);
  };
}

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
  const matches = new Set(allContent.match(/--v-theme-[\w-]+/g));
  return [...matches].map((it) => it.replace('--v-theme-', ''));
}
