export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      let cumulatedAttributesAndEventLinesInfo = [];
      for (const lineInfo of linesInfo) {
        if (lineInfo.isCommentedLine) {
          continue;
        }

        if (!lineInfo.hasStartingTag || lineInfo.isCommentedLine) {
          if (lineInfo.attributeNames[0]) {
            cumulatedAttributesAndEventLinesInfo.push(lineInfo);
          }
        }

        if (lineInfo.eventName) {
          cumulatedAttributesAndEventLinesInfo.push(lineInfo);
        }

        if (lineInfo.hasEndingTag) {
          const equalErrors = getEqualsErrors(cumulatedAttributesAndEventLinesInfo);
          if (equalErrors) {
            for (const equalError of equalErrors) {
              if (!linesInfo[equalError.lineNumber - 1].allowMultipleTags) {
                errors.push({
                  filePath,
                  line: equalError.lineNumber,
                  message: equalError.message,
                });
              }
            }
          }

          cumulatedAttributesAndEventLinesInfo = [];
        }
      }
    }

    return { errors };
  },
};

function getEqualsErrors(cumulatedAttributesAndEventLinesInfo) {
  if (cumulatedAttributesAndEventLinesInfo.length === 0) {
    return;
  }

  // Compute max Length
  let maxLength = 0;
  for (const lineInfo of cumulatedAttributesAndEventLinesInfo) {
    const name = lineInfo.eventName || lineInfo.attributeNames[0];
    const nameLength = name.length + (lineInfo.eventName || lineInfo.isVueBinding ? 1 : 0);
    if (nameLength > maxLength) {
      maxLength = nameLength;
    }
  }
  const expectedEqualPosition = cumulatedAttributesAndEventLinesInfo[0].indentationCount + 1 + maxLength;

  const errors = [];
  for (const lineInfo of cumulatedAttributesAndEventLinesInfo) {
    if (lineInfo.equalPosition !== expectedEqualPosition) {
      errors.push({
        lineNumber: lineInfo.lineNumber,
        message: `Equal is not correctly aligned`,
      });
    }
  }

  return errors;
}
