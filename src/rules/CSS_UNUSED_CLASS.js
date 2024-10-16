import { parse } from 'scss-parser';
import { computeVuePathFromVmcOrScssPath, getCSSClasses, isClassIgnored } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['style'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { content } = index.byPath[filePath];
      const ast = parse(content);

      const vueFilePath = computeVuePathFromVmcOrScssPath(filePath, true);
      const vueContent = index.byPath[vueFilePath]?.content;

      if (vueContent && !vueContent.includes(':class') && !vueContent.includes(':content-class')) {
        const classes = getCSSClasses(ast, true);
        for (const className of classes) {
          if (!vueContent.includes(className) && !isClassIgnored(className)) {
            errors.push({
              filePath: filePath,
              line: null,
              message: `Remove CSS class '${className}'. It is not used.`,
            });
          }
        }
      }
    }

    return { errors };
  },
};
