const IGNORED_COMPONENTS = ['stoic-app'];

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
      }
    }

    return { errors };
  },
};
