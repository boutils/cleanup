import { computeVuePathFromVmcOrScssPath } from '../utils.js';

const SECTIONS = ['props', 'data', 'computed', 'methods'];
const PUBLIC_METHODS = ['stoic-ask-dialog__processMessage', 'stoic-chart-header__getWidth'];

export default {
  validate: (index) => {
    const filesPaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { vmc, content } = index.byPath[filePath];

      const fileName = filePath.split('/').at(-1).split('.').at(0);

      const vuePath = computeVuePathFromVmcOrScssPath(filePath);
      const vueContent = index.byPath[vuePath]?.content;

      for (const section of SECTIONS) {
        const names = vmc[section].map((it) => it.name.replace(/-/g, ''));

        const vmcText = section === 'props' ? content.toLowerCase() : content;
        const vueText = section === 'props' ? vueContent.toLowerCase() : vueContent;

        for (const name of names) {
          const _name = `${fileName}__${name}`;
          if (PUBLIC_METHODS.includes(_name)) {
            continue;
          }

          const hasInVMC = [...vmcText.matchAll(new RegExp(name, 'g'))].length > 1 || vmcText.includes('this[');
          if (
            !vueText.includes(name) &&
            !hasInVMC &&
            name !== 'prefixid' &&
            name !== 'isidentifier' &&
            !_name.endsWith('dialog__validate') &&
            !_name.endsWith('dialog__validateOnEnter') &&
            !_name.includes('dialog__arrow')
          ) {
            errors.push({
              filePath: filePath,
              line: null,
              message: `'${name}' in ' ${section}' is not used (${_name})`,
            });
          }
        }
      }
    }

    return { errors };
  },
};
