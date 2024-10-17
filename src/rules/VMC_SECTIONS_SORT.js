const SECTIONS = [
  'name',
  'components',
  'props',
  'emits',
  'mixins',
  'i18n',
  'data()',
  'computed',
  'created()',
  'mounted()',
  'beforeDestroy()',
  'destroyed()',
  'beforeUnmount()',
  'unmounted()',
  'activated()',
  'deactivated()',
  'methods',
  'watch',
];

export default {
  validate: (index) => {
    // Check VMC files
    const filesPaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      let started = false;
      const orderedSections = [];
      for (const line of lines) {
        if (line.includes('export default defineComponent({')) {
          started = true;
          continue;
        } else if (!started) {
          continue;
        }

        for (const section of SECTIONS) {
          if (line.trim().startsWith(section)) {
            orderedSections.push(section);
          }
        }
      }

      const fileErrors = checkOrderedVMCSections(filePath, orderedSections);

      if (fileErrors.length > 0) {
        errors.push(...fileErrors);
      }
    }

    return { errors };
  },
};

function checkOrderedVMCSections(filePath, orderedSections) {
  let index = null;
  let lastSection = null;
  const errors = [];
  for (const section of orderedSections) {
    const localIndex = SECTIONS.indexOf(section);
    if (index !== null && localIndex <= index) {
      errors.push({
        filePath,
        line: null,
        message: `VMC section '${section.replace('()', '')}' should be before '${lastSection.replace('()', '')}'`,
      });
    }

    index = localIndex;
    lastSection = section;
  }

  return errors;
}
