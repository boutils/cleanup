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
            const existingName = line.substring(index).split(' ')[0];
            errors.push({
              filePath,
              line: lineIndex + 1,
              message: `TS type should be camel-case. Replace "${existingName}" by "${existingName.charAt(0).toUpperCase() + existingName.slice(1)}"`,
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
