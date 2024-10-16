import { parse } from 'scss-parser';
import { computeVuePathFromVmcOrScssPath } from '../utils.js';

const IGNORED_CLASSES = [
  'active',
  'disabled',
  'fill-height',
  'flex-column',
  'headline',
  'title',
  'caption',
  'overline',
  'syntax',
  'table',
  'theme--dark',
];

export default {
  validate: (index) => {
    const filesPaths = index.byType['style'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { content } = index.byPath[filePath];
      const ast = parse(content);

      const vueFilePath = computeVuePathFromVmcOrScssPath(filePath, true);
      const vueContent = index.byPath[vueFilePath]?.content;

      if (vueContent && !vueContent.includes(':class') && !vueContent.includes(':content-class')) {
        const classes = getCSSClasses(ast, true);
        for (const class_ of classes) {
          if (!vueContent.includes(class_) && !IGNORED_CLASSES.includes(class_)) {
            errors.push({
              filePath: filePath,
              line: null,
              message: `Remove class '${class_}'. It is not used.`,
            });
          }
        }
      }
    }

    return { errors };
  },
};

function getCSSClasses(ast, ignoreDeep = false) {
  let classes = [];

  if (ast.type === 'class') {
    classes = ast.value.map((it) => it.value);
  }

  if (Array.isArray(ast.value)) {
    if (
      ast.type === 'rule' &&
      ignoreDeep &&
      ast.value[0].type === 'selector' &&
      ast.value[0].value[0].type === 'function' &&
      ast.value[0].value[0].value[0].value[0].value === 'deep'
    ) {
      return [];
    }

    for (const subAst of ast.value) {
      classes.push(...getCSSClasses(subAst, ignoreDeep));
    }
  }

  return classes.filter((it) => !IGNORED_CLASSES.includes(it) && !it.startsWith('v-'));
}
