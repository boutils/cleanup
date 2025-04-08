const ignores = ['libs/typescript/components/.storybook/preview-head.html'];

export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      if (ignores.includes(filePath)) {
        continue;
      }

      const { linesInfo } = index.byPath[filePath];
      let isInsideAttribute = false;
      for (const lineInfo of linesInfo) {
        if (lineInfo.isAttributeOnlyEnded) {
          isInsideAttribute = false;
        }

        if (lineInfo.isAttributeOnlyStarted) {
          isInsideAttribute = true;
        }

        const expectedIndentation = computeExpectedIndentation(lineInfo, isInsideAttribute);

        if (lineInfo.isCommentedLine || lineInfo.isEmptyLine || lineInfo.depth < 0) {
          continue;
        }

        if (expectedIndentation !== lineInfo.indentationCount && !lineInfo.allowMultipleTags) {
          errors.push({
            filePath,
            line: lineInfo.lineNumber,
            message: `Indentation should be ${expectedIndentation} instead of ${lineInfo.indentationCount}`,
          });
        }
      }
    }

    return { errors };
  },
};

function computeExpectedIndentation(lineInfo, isInsideAttribute) {
  const originalIndentation = lineInfo.depth * 2;
  if (
    lineInfo.hasStartingTag ||
    (lineInfo.isClosingTag &&
      !isInsideAttribute &&
      !lineInfo.isShortClosingTag &&
      (!lineInfo.hasEndingTag || lineInfo.tagName !== 'span'))
  ) {
    return originalIndentation;
  }

  return isInsideAttribute ? originalIndentation + 4 : originalIndentation + 2;
}
