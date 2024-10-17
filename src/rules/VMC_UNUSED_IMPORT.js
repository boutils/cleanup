import { computeVuePathFromVmcOrScssPath, kebabize } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'].filter((it) => it.includes('.vmc.'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { vmc } = index.byPath[filePath];
      const vuePath = computeVuePathFromVmcOrScssPath(filePath);
      const vueContent = index.byPath[vuePath]?.content;

      if (vueContent.includes('<component')) {
        continue;
      }

      for (const componentId of vmc.components.values) {
        const tag = '<' + kebabize(componentId);
        if (!vueContent.includes(tag)) {
          errors.push({
            filePath,
            line: vmc.components.lineIndex + 1,
            message: `IMPORT of '${componentId}' is not used. Please remove it.`,
          });
        }
      }
    }

    return { errors };
  },
};
