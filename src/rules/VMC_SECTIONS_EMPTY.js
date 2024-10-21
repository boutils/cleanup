const EMPTY_SECTION_TO_REMOVE = [
  'data():,',
  'components: {},',
  'computed: {},',
  'created() {},',
  'emits: [],',
  'mixins: [],',
  'mounted() {},',
  'methods: {},',
  "name: '',",
  'props: {},',
  'unmounted() {},',
  'watch: {},',
];

export default {
  validate: (index) => {
    const filePaths = index.byType['vmc'];

    const errors = [];
    for (const filePath of filePaths) {
      const { lines } = index.byPath[filePath];

      for (const [lineIndex, line] of lines.entries()) {
        const trimmedLine = line.trim();

        if (EMPTY_SECTION_TO_REMOVE.includes(trimmedLine)) {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'Remove this section (line empty)',
          });
        }
      }
    }

    return { errors };
  },
};
