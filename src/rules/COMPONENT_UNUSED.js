const IGNORED_COMPONENTS = ['stoic-middleware', 'stoic-comparator-field-node'];
import { camelize } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const componentName = filePath.split('/').pop().replace('.vue', '');
      const componentNameCamelized = camelize(componentName);

      if (
        !index.allContent.includes(`<${componentName}`) &&
        !IGNORED_COMPONENTS.includes(componentName) &&
        !index.allContent.includes(`'${componentNameCamelized}'`)
      ) {
        errors.push({
          filePath: filePath,
          line: 1,
          message: `This component '${componentName}' is not used in the project.`,
        });
      }
    }

    return { errors };
  },
};
