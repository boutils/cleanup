import { getSortingError } from '../utils.js';

export default {
  validate: (index) => {
    // Check VMC files
    const filesPaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      let isInsideType = false;
      let isIgnored = false;
      let relativeLineNumber = [];
      let typeIndex = 0;
      const typesVarIds = [];
      for (const [lineIndex, line] of lines.entries()) {
        const trimmedLine = line.trim();
        if (isInsideType && line === '};') {
          isInsideType = false;
          isInsideType = false;
          isIgnored = false;
          typeIndex++;
          continue;
        }

        if (isInsideType && !isIgnored) {
          typesVarIds[typeIndex] = typesVarIds[typeIndex] || [];
          typesVarIds[typeIndex].push(trimmedLine.split(':')[0].replace('?', ''));
        }

        if (trimmedLine.includes('};')) {
          isIgnored = false;
        }

        if (trimmedLine.startsWith('type ') && !trimmedLine.includes('};') && trimmedLine.includes('{')) {
          isInsideType = true;
          relativeLineNumber[typeIndex] = lineIndex + 1;
        } else if (isInsideType && trimmedLine.includes('{') && !trimmedLine.includes('}')) {
          isIgnored = true;
        }
      }

      for (const [i, res] of typesVarIds.entries()) {
        const sortingAttrError = getSortingError(res, relativeLineNumber[i] + 1 + res.length);
        if (sortingAttrError) {
          errors.push({
            filePath,
            line: sortingAttrError.lineNumber,
            message: sortingAttrError.message,
          });
        }
      }
    }

    return { errors };
  },
};
