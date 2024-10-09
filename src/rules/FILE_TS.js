import { getSortingError } from '../utils.js';

const IGNORED_FILES = [
  'apps/office/src/functions/functions.js',
  'apps/office/vite.config.js',
  'libs/python/jupyter-ext-minimal-ui/lib/icons.js',
  'libs/python/jupyter-ext-minimal-ui/lib/index.js',
  'libs/python/jupyter-ext-minimal-ui/jupyter_ext_minimal_ui/labextension/static/lib_index_js.6e9105e073af55e8e85a.js',
  'libs/python/jupyter-ext-minimal-ui/style/index.js',
  'libs/python/jupyter-ext-minimal-ui/jupyter_ext_minimal_ui/labextension/static/remoteEntry.fb4b540938d2d7d47792.js',
  'libs/python/jupyter-ext-minimal-ui/jupyter_ext_minimal_ui/labextension/static/style.js',
  'libs/python/jupyter-ext-minimal-ui/jupyter_ext_minimal_ui/labextension/static/style_index_js.9d014b87f9787f043e51.js',
  'libs/python/jupyter-ext-minimal-ui/jupyter_ext_minimal_ui/labextension/static/vendors-node_modules_debug_src_browser_js.9f67fd368a906ed09b96.js',
  'libs/typescript/components/vite.config.js',
  'libs/typescript/components/vitest.config.js',
  'libs/typescript/utilities/utils.js',
  'libs/typescript/web-components/build.js',
  'libs/typescript/web-components/generate.js',
];

export default {
  validate: (index) => {
    // Check VMC files
    const filesPaths = index.byType['lib'].filter((it) => it.endsWith('.js'));

    const errors = [];

    for (const filePath of filesPaths) {
      if (!IGNORED_FILES.includes(filePath)) {
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
