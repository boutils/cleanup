export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.attributeNames.length > 0) {
          for (const attribute of lineInfo.attributeNames) {
            if (hasUpperCase(attribute)) {
              errors.push({
                filePath,
                line: lineInfo.lineNumber,
                message: `'${attribute}' should be kebab case (no upper case)`,
              });
            }
          }
        }
      }
    }

    return { errors };
  },
};

const IGNORE_KEYWORDS_CASES = ['preserveAspectRatio', 'viewBox'];

function computeCharCase(ch) {
  if (!isNaN(ch * 1)) {
    return 'ch is numeric';
  }

  if (ch === ch.toLowerCase()) {
    return 'lower case';
  }

  return 'upper case';
}

function hasUpperCase(string) {
  if (IGNORE_KEYWORDS_CASES.includes(string)) {
    return false;
  }

  for (const ch of string) {
    if (ch === ':') {
      return false;
    }

    if (computeCharCase(ch) === 'upper case') {
      return true;
    }
  }

  return false;
}
