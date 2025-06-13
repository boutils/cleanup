import { isClassIgnored } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.attributeNames.length === 1 && lineInfo.attributeNames[0] === 'class' && !lineInfo.isVueBinding) {
          const classes = lineInfo.attributeValue.split(' ');
          for (const _class of classes) {
            if (isClassIgnored(_class)) {
              continue;
            }

            if (_class.toLowerCase() !== _class) {
              errors.push({
                filePath,
                line: lineInfo.lineNumber,
                message: `Class name "${_class}" should be lowercase.`,
              });
            }

            if (_class.includes('_')) {
              errors.push({
                filePath,
                line: lineInfo.lineNumber,
                message: `Class name "${_class}" should not contain underscores.`,
              });
            }

            if (!_class.startsWith('stoic-') && _class.length > 5) {
              errors.push({
                filePath,
                line: lineInfo.lineNumber,
                message: `Class name "${_class}" should start with "stoic-".`,
              });
            }
          }
        }
      }
    }

    return { errors };
  },
};
