import { isValidHtmlAttribute } from '../utils.js';

const ignoredFiles = ['libs/typescript/components/stoic-charts-layout/stoic-charts-layout.vue'];

export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.tagName?.startsWith('stoic') && lineInfo.attributeNames?.length > 0) {
          for (const attributeName of lineInfo.attributeNames) {
            if (attributeName === 'prefix-id' || isValidHtmlAttribute(attributeName)) {
              continue;
            }

            const relatedVmcFilePath = Object.keys(index.byPath).find((it) => it.includes(`${lineInfo.tagName}.vmc.`));
            const { vmc } = index.byPath[relatedVmcFilePath];

            if (!vmc.props.find((it) => it.name === attributeName) && !ignoredFiles.includes(filePath)) {
              errors.push({
                filePath,
                line: lineInfo.lineNumber,
                message: `Attribute '${attributeName}' is not used in the VMC file`,
              });
            }
          }
        }
      }
    }

    return { errors };
  },
};
