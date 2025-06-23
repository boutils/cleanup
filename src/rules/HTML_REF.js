import { computeRelatedVmcPath } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      const vmcPath = computeRelatedVmcPath(filePath);
      const { content: vmcContent } = index.byPath[vmcPath] || {};

      for (const lineInfo of linesInfo) {
        if (lineInfo.isCommentedLine) {
          continue;
        }

        if (
          !lineInfo.attributeNames.includes('ref') ||
          index.allContent.includes(`$refs.${lineInfo.attributeValue}`) ||
          index.allContent.includes(`$refs?.${lineInfo.attributeValue}`)
        ) {
          continue;
        }

        if (!lineInfo.isVueBinding && !vmcContent.includes(`this.$refs.${lineInfo.attributeValue}`)) {
          errors.push({
            filePath: filePath,
            line: lineInfo.lineNumber,
            message: `Remove unused REF named '${lineInfo.attributeValue}'. It is not used in the component.`,
          });
          continue;
        } else if (lineInfo.isVueBinding && !vmcContent.includes('this.$refs')) {
          errors.push({
            filePath: filePath,
            line: lineInfo.lineNumber,
            message: `Remove unused dynamic REF '${lineInfo.attributeValue}'. It is not used in the component.`,
          });
        }
      }
    }

    return { errors };
  },
};
