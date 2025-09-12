const IGNORED_PATHS = ['apps/', '/jupyter-ext-minimal-ui/', '/.storybook/', 'tools/'];
const IGNORED_LIBS_PATHS = [
  'libs/typescript/components/tests/local-storage-mock.ts',
  'libs/typescript/stoic-mill-client/test/test-mill.ts',
  'libs/typescript/stoic-workspace-kit-client/src/index.ts',
  'libs/typescript/utilities/functional.ts',
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
        !filePath.endsWith('.test.ts')
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
