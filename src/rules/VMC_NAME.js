import { camelize } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { vmc } = index.byPath[filePath];

      const fileName = filePath.split('/').at(-1).split('.').at(0);
      const validComponentName = camelize(fileName);

      if (!vmc.name) {
        errors.push({
          filePath,
          message: `VMC component should be named: Add name '${validComponentName}' to VMC file`,
        });
      } else if (vmc.name !== validComponentName) {
        errors.push({
          filePath,
          message: `Wrong VMC component name: replace '${vmc.name}' by '${validComponentName}'`,
        });
      }
    }

    return { errors };
  },
};
