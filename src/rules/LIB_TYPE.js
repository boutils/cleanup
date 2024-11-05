const IGNORE_FILES = [
  'libs/typescript/stoic-workspace-kit-client/src/contents/types.gen.ts',
  'libs/typescript/stoic-workspace-kit-client/src/notebooks/types.gen.ts',
];

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      if (IGNORE_FILES.includes(filePath)) {
        continue;
      }

      for (const [lineIndex, line] of lines.entries()) {
        const hasExportedType = line.startsWith('export type ');
        const hasType = line.startsWith('type ');
        if (hasExportedType || hasType) {
          const index = hasExportedType ? 12 : 5;
          const firstChar = line[index];

          if (!isUpperCase(firstChar)) {
            errors.push({
              filePath,
              line: lineIndex + 1,
              message: 'LIB_TYPE: remove export type ' + line[index],
            });
          }
        }
      }
    }

    return { errors };
  },
};

function isUpperCase(str) {
  return str === str.toUpperCase();
}
