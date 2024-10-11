import { isValidHtmlAttribute, isValidHtmlTag } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (isValidHtmlTag(lineInfo.tagName) && lineInfo.attributeNames?.length > 0) {
          for (const attribute of lineInfo.attributeNames) {
            if (!isValidHtmlAttribute(attribute)) {
              errors.push({
                filePath,
                line: lineInfo.lineNumber,
                message: `Attribute '${attribute}' is not valid for HTML tag '${lineInfo.tagName}'`,
              });
            }
          }
        }
      }
    }

    return { errors };
  },
};
