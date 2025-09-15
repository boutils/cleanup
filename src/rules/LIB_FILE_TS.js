const IGNORED_DIRECTORIES = ['libs/python/jupyter-ext-minimal-ui/'];

const IGNORED_FILES = ['vite.config.js', 'vitest.config.js', 'src/utilities/utils.js', 'sxripts/generate-component.js'];

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
