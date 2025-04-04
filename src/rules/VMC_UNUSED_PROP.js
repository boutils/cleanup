import { camelize, computeRelatedVuePath } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { vmc, content, lines } = index.byPath[filePath];
      const propsNames = vmc.props.map((it) => camelize(it.name));

      for (const propName of propsNames) {
        // It is not used in the VMC file (there is only one instance in props)
        if (countInstances(content, propName) < 2) {
          // It is not used in the VMC file as a watcher
          if (!vmc.watch.find((it) => it.name === propName)) {
            // It is not used in the VUE file
            const vueFilePath = computeRelatedVuePath(filePath);
            const vueContent = index.byPath[vueFilePath]?.content;

            if (!vueContent.includes(propName)) {
              const lineIndex = lines.findIndex((it) => it.trim().startsWith(`${propName}:`));
              errors.push({
                filePath,
                line: lineIndex > -1 ? lineIndex + 1 : null,
                message: `Prop '${propName}' is not used, it should be removed`,
              });
            }
          }
        }
      }
    }

    return { errors };
  },
};

function countInstances(string, word) {
  return string.split(word).length - 1;
}
