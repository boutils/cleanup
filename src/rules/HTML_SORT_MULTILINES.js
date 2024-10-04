import { getSortingError } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      let cummulatedAttributeNames = [];
      let cummulatedEventNames = [];
      for (const lineInfo of linesInfo) {
        if (lineInfo.isCommentedLine) {
          continue;
        }

        if (!lineInfo.hasStartingTag || lineInfo.isCommentedLine) {
          cummulatedAttributeNames.push(...lineInfo.attributeNames);
        }

        if (lineInfo.eventName) {
          cummulatedEventNames.push(lineInfo.eventName);
        }

        if (lineInfo.hasEndingTag) {
          const relativeLineNumber = lineInfo.lineNumber - cummulatedEventNames.length + 1;
          const sortingAttrError = getSortingError(cummulatedAttributeNames, relativeLineNumber);
          if (sortingAttrError) {
            errors.push({
              filePath,
              line: sortingAttrError.lineNumber,
              message: sortingAttrError.message,
            });
          }

          const sortingEventsError = getSortingError(cummulatedEventNames, lineInfo.lineNumber + 1);
          if (sortingEventsError) {
            errors.push({
              filePath,
              line: sortingEventsError.lineNumber,
              message: sortingEventsError.message,
            });
          }

          cummulatedAttributeNames = [];
          cummulatedEventNames = [];
        }
      }
    }

    return { errors };
  },
};
