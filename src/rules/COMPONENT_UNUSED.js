const IGNORED_COMPONENTS = ['stoic-excel-dialog', 'stoic-panel'];

export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const componentName = filePath.split('/').pop().replace('.vue', '');

      if (!index.allContent.includes(`<${componentName}`) && !IGNORED_COMPONENTS.includes(componentName)) {
        errors.push({
          filePath: filePath,
          line: 1,
          message: `This component '${componentName}' is not used in the project.`,
        });
        continue;
      }
    }

    return { errors };
  },
};
