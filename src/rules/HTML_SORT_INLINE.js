import { getSortingError } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.hasStartingTag && !lineInfo.isCommentedLine) {
          const sortingAttrError = getSortingError(lineInfo.attributeNames, lineInfo.lineNumber);
          if (sortingAttrError) {
            errors.push({
              filePath,
              line: sortingAttrError.lineNumber,
              message: sortingAttrError.message,
            });
          }
        }
      }
    }

    return { errors };
  },
};
