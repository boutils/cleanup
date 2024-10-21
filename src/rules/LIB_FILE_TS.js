const IGNORED_DIRECTORIES = ['libs/python/jupyter-ext-minimal-ui/'];

const IGNORED_FILES = [
  'apps/office/src/functions/functions.js',
  'apps/office/vite.config.js',
  'libs/typescript/components/vite.config.js',
  'libs/typescript/components/vitest.config.js',
  'libs/typescript/utilities/utils.js',
  'libs/typescript/web-components/build.js',
  'libs/typescript/web-components/generate.js',
  'tools/ui/generate-component.js',
];

export default {
  validate: (index) => {
    // Check VMC files
    const filesPaths = index.byType['lib'].filter((it) => it.endsWith('.js'));

    const errors = [];

    for (const filePath of filesPaths) {
      if (!isFileIgnored(filePath)) {
        errors.push({
          filePath,
          line: null,
          message: 'Convert this file to TypeScript',
        });
      }
    }

    return { errors };
  },
};

function isFileIgnored(filePath) {
  return IGNORED_FILES.includes(filePath) || IGNORED_DIRECTORIES.some((dir) => filePath.includes(dir));
}
