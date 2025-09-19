const IGNORE_FILES = [
  'src/components/shared/plugins/helpers/dimensions/positions.ts',
  'src/utilities/collections.ts',
  'src/utilities/columnars.ts',
  'src/utilities/dom.ts',
  'src/utilities/functional.ts',
  'src/utilities/environment.ts',
  'src/utilities/search.ts',
  'src/utilities/system.ts',
  'src/utilities/text.ts',
  'src/utilities/utils.js',
  'src/utilities/uuid.ts',
  'src/utilities/values.ts',
];

export default {
  validate: (index) => {
    // Check VMC & VUE files
    const filesPaths = index.byType['lib'].concat(index.byType['vue']);

    const errors = [];
    const _exports = {};
    for (const filePath of filesPaths) {
      accumulateExports(_exports, filePath, index.byPath[filePath].content);
    }

    for (const [keyword, _export] of Object.entries(_exports)) {
      for (const filePath of filesPaths) {
        const { content } = index.byPath[filePath];
        if (content.includes(keyword) && filePath !== _export.filePath) {
          _export.used = true;
          break;
        }
      }
    }

    for (const [keyword, _export] of Object.entries(_exports)) {
      if (
        !_export.used &&
        !_export.filePath.includes('.stories.') &&
        !IGNORE_FILES.includes(_export.filePath) &&
        !_export.filePath.includes('types.ts')
      ) {
        errors.push({
          filePath: _export.filePath,
          line: _export.lineNumber,
          message: `'export' keyword should be removed before '${keyword}'`,
        });
      }
    }

    return { errors };
  },
};

function accumulateExports(_exports, filePath, content) {
  const lines = content.split('\n');

  for (const [lineIndex, line] of lines.entries()) {
    const trimmedLine = line.trim();
    if (
      (!trimmedLine.startsWith('export') && !trimmedLine.startsWith('import')) ||
      filePath.includes('dom-helpers.js') ||
      trimmedLine.startsWith('export {')
    ) {
      continue;
    }

    if (trimmedLine.startsWith('export const') && !trimmedLine.startsWith('export const {')) {
      const keyword = computeExportKeyword('export const', trimmedLine, ' =');
      _exports[keyword] = {
        used: false,
        filePath,
        lineNumber: lineIndex + 1,
      };
    } else if (trimmedLine.startsWith('export function*')) {
      const keyword = computeExportKeyword('export function*', trimmedLine, '(');
      _exports[keyword] = {
        used: false,
        filePath,
        lineNumber: lineIndex + 1,
      };
    } else if (trimmedLine.startsWith('export function')) {
      const keyword = computeExportKeyword('export function', trimmedLine, '(');
      _exports[keyword] = {
        used: false,
        filePath,
        lineNumber: lineIndex + 1,
      };
    }
  }
}

function computeExportKeyword(key, line, delimiter) {
  const startIndex = line.indexOf(key) + key.length + 1;
  const keyword = line.substr(startIndex, line.indexOf(delimiter) - startIndex).replace(/ *<[^)]*> */g, '');

  return keyword.includes(':') ? keyword.split(':')[0] : keyword;
}
