const IGNORED_PATHS = ['.storybook/', 'scripts/'];
const IGNORED_LIBS_PATHS = [
  'src/global.d.ts',
  'src/libs/mill-client/test/test-mill.ts',
  'src/main.ts',
  'src/utilities/functional.ts',
  'src/libs/worker/worker.ts',
];

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];

    for (const filePath of filesPaths) {
      const pathSplit = filePath.split('/');
      let stringToFind = pathSplit.slice(-2).join('/').replace('.ts', '');
      let libName = stringToFind.split('/').pop();

      if (libName === 'index') {
        stringToFind = `/${pathSplit[pathSplit.length - 2]}`;
        libName = stringToFind.split('/').pop();
      }

      if (stringToFind.endsWith('.js')) {
        continue;
      }

      if (
        !index.allContent.includes(`${stringToFind}';`) &&
        !index.allContent.includes(`./${libName}';`) &&
        !IGNORED_PATHS.some((ignoredPath) => filePath.includes(ignoredPath)) &&
        !IGNORED_LIBS_PATHS.includes(filePath) &&
        !libName.includes('.stories') &&
        !filePath.endsWith('.test.ts') &&
        !filePath.includes('.vmc')
      ) {
        errors.push({
          filePath: filePath,
          line: 1,
          message: `This lib '${libName}' (search '${stringToFind}') is not used in the project.`,
        });
      }
    }

    return { errors };
  },
};
