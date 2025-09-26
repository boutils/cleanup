import { computeRelatedVuePath, getCSSClasses, isClassIgnored } from '../utils.js';

const IGNORED_CLASSES = ['empty', 'focused', 'value-copied', 'selected', 'stoic-menu-list'];
export default {
  validate: (index) => {
    const filesPaths = index.byType['style'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { scss } = index.byPath[filePath];
      const { ast } = scss;

      const componentName = filePath.split('/').pop().replace('.scss', '').replace('.unscoped', '');
      const classes = getCSSClasses(ast, true);
      const vueFilePath = computeRelatedVuePath(filePath, true);
      const vueContent = index.byPath[vueFilePath]?.content;

      for (const className of classes) {
        if (
          vueContent &&
          !isClassNameIgnored(className) &&
          !className.startsWith(componentName) &&
          !className.startsWith(`are-`) &&
          !className.startsWith(`is-`) &&
          !className.startsWith(`has-`) &&
          !className.startsWith(`align-`) &&
          !className.startsWith(`in-`) &&
          !className.startsWith(`type-`) &&
          !className.startsWith(`position-`) &&
          !className.startsWith(`with-`) &&
          !className.startsWith(`without-`) &&
          !className.startsWith(`expand-collapse-`) &&
          !className.startsWith(`slide-up-`) &&
          !className.startsWith(`stoic-menu-`) &&
          !vueContent.includes(`<${className}`)
        ) {
          errors.push({
            filePath,
            message: `The CSS class '${className}' should be prefixed with the component name '${componentName}'.`,
          });
        }
      }
    }

    return { errors };
  },
};

function isClassNameIgnored(className) {
  return isClassIgnored(className) || IGNORED_CLASSES.includes(className);
}
