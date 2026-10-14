const IGNORE_FILES = [
  'src/components/stoic-deck/components/stoic-deck-body/components/stoic-deck-perspective-signals/components/stoic-deck-visual/plugins/vertical-stacked-bars.ts',
  'src/components/shared/plugins/helpers/dimensions/positions.ts',
  'src/libs/period-primitives.ts',
  'src/libs/stack.ts',
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
  'src/components/stoic-deck/components/stoic-deck-body/components/stoic-deck-perspective-signals/components/stoic-deck-visual/plugins/delta-tooltip.ts',
  'src/components/stoic-deck/components/stoic-deck-body/components/stoic-deck-perspective-signals/components/stoic-deck-visual/plugins/month-grid-lines.ts',
  'src/components/stoic-skeleton/lib/stoic-skeleton.lib.ts',
  'src/libs/baseline-backtests.ts',
  'src/libs/duckdb.ts',
  'src/libs/plugins/drawdown-areas.ts',
  'src/libs/plugins/helpers/histogram.ts',
  'src/libs/plugins/notable-periods.ts',
  'src/libs/plugins/vertical-aggregated-bar.ts',
  'src/libs/reports.ts',
  'src/libs/table.ts',
  'src/utilities/version-check.ts',
];

export default {
  validate: (index) => {
    // Check VMC & VUE files
    const filesPaths = index.byType['lib'].concat(index.byType['vue']).concat(index.byType['tests'] ?? []);

    const errors = [];
    const _exports = {};
    for (const filePath of filesPaths) {
      accumulateExports(_exports, filePath, index.byPath[filePath].content);
    }

    const isUsedElsewhere = buildUsageLookup(filesPaths, index);

    for (const [keyword, _export] of Object.entries(_exports)) {
      if (
        _export.filePath.includes('.stories.') ||
        IGNORE_FILES.includes(_export.filePath) ||
        _export.filePath.includes('types.ts')
      ) {
        continue;
      }

      if (!isUsedElsewhere(keyword, _export.filePath)) {
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

// Equivalent to "some other file's content includes the keyword". An identifier always sits inside one maximal run of
// identifier characters, so indexing those runs per file replaces a scan of every file for every export.
function buildUsageLookup(filesPaths, index) {
  const filesByToken = new Map();

  for (const filePath of filesPaths) {
    for (const token of new Set(index.byPath[filePath].content.match(/[A-Za-z0-9_$]+/g))) {
      let files = filesByToken.get(token);
      if (!files) {
        files = new Set();
        filesByToken.set(token, files);
      }
      files.add(filePath);
    }
  }

  const isElsewhere = (files, ownFilePath) => files.size > 1 || !files.has(ownFilePath);

  return (keyword, ownFilePath) => {
    if (!/^[A-Za-z0-9_$]+$/.test(keyword)) {
      return filesPaths.some(
        (filePath) => filePath !== ownFilePath && index.byPath[filePath].content.includes(keyword)
      );
    }

    const exactFiles = filesByToken.get(keyword);
    if (exactFiles && isElsewhere(exactFiles, ownFilePath)) {
      return true;
    }

    for (const [token, files] of filesByToken) {
      if (token.includes(keyword) && isElsewhere(files, ownFilePath)) {
        return true;
      }
    }

    return false;
  };
}

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
