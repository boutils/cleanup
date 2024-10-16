import { parse } from 'scss-parser';
import { computeCSSPathFromVuePath, getCSSClasses, isClassIgnored } from '../utils.js';

const SEPARATOR = [' ', ','];

export default {
  validate: (index) => {
    const stoicCSSFiles = index.byType['style'].filter((it) => it.includes('/stoic.scss'));

    const globalValidClasses = [];
    for (const stoicCSSFile of stoicCSSFiles) {
      const { content } = index.byPath[stoicCSSFile];
      const ast = parse(content);
      globalValidClasses.push(...getCSSClasses(ast));
    }

    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      const scssFilePath = computeCSSPathFromVuePath(filePath, true);
      const { content } = index.byPath[scssFilePath];
      const ast = parse(content);

      const localClasses = getCSSClasses(ast);
      const validClasses = [...globalValidClasses, ...localClasses];

      for (const lineInfo of linesInfo) {
        if (lineInfo.attributeNames.length === 1 && lineInfo.attributeNames[0] === 'class') {
          const classList = getClassListFromAttribute(lineInfo.line);

          for (const className of classList) {
            if (!validClasses.includes(className) && !isClassIgnored(className, filePath, lineInfo.lineNumber)) {
              errors.push({
                filePath: filePath,
                line: lineInfo.lineNumber,
                message: `Remove CSS class '${className}'. It is not used.`,
              });
            }
          }
        }
      }
    }

    return { errors };
  },
};

function extractDynamicClassNames(input) {
  let str = input.trim().replace(':class', '');
  const classNames = [];
  let pos = str.indexOf(':');
  while (pos > -1) {
    const beforeString = str.substr(0, pos);
    for (const separator of SEPARATOR) {
      const last = beforeString.lastIndexOf(separator);
      if (last > -1 && last < pos) {
        const classStr = beforeString.substr(last + 1, pos);
        const className = classStr.replace(/'/g, '');
        if (className) {
          classNames.push(className);
        }

        str = str.substr(last + 2 + classStr.length);
        break;
      }
    }

    pos = str.indexOf(':');
  }

  return classNames;
}

function getClassListFromAttribute(attributeLine) {
  const start = attributeLine.indexOf('"') + 1;
  const str = attributeLine.substr(start, attributeLine.lastIndexOf('"') - start);

  if (attributeLine.includes(':class')) {
    if (attributeLine.includes('{')) {
      return extractDynamicClassNames(attributeLine);
    }

    return [];
  } else {
    return str.split(' ');
  }
}
