const ignoredEvents = ['click'];

const ignoredFiles = [
  'libs/typescript/components/stoic-chart-composer/components/stoic-charts-layout/stoic-charts-layout.vue',
];

export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      for (const lineInfo of linesInfo) {
        if (lineInfo.tagName?.startsWith('stoic') && lineInfo.eventName) {
          const relatedVmcFilePath = Object.keys(index.byPath).find((it) => it.includes(`${lineInfo.tagName}.vmc.`));
          const { vmc } = index.byPath[relatedVmcFilePath];
          if (
            !vmc.emits.values.includes(lineInfo.eventName) &&
            !ignoredEvents.includes(lineInfo.eventName) &&
            !ignoredFiles.includes(filePath)
          ) {
            errors.push({
              filePath,
              line: lineInfo.lineNumber,
              message: `Event '${lineInfo.eventName}' is not used in the VMC file`,
            });
          }
        }
      }
    }

    return { errors };
  },
};
