import { computeRelatedVuePath, kebabize } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { vmc } = index.byPath[filePath];
      const vuePath = computeRelatedVuePath(filePath);
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
