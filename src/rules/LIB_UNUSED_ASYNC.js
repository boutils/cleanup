const IGNORED = [
  'apps/office/src/actions/action-generate-presentation.ts__generatePresentation',
  'apps/office/src/actions/live/live-signal.ts__fetchSeriesData',
  'apps/office/src/lib/regimes-store.ts__getOrFetchRegimes',
  'apps/office/src/lib/signals-store.ts__getOrFetchSignals',
  'libs/typescript/stoic-officegen/regimes/index.ts__fetchRegimesSchema',
  'libs/typescript/stoic-officegen/strategies/index.ts__fetchStrategiesMetadata',
  'libs/typescript/stoic-officegen/tactics/index.ts__fetchTacticCombinations',
  'libs/typescript/stoic-officegen/tactics/index.ts__fetchTacticPeriods',
  'libs/typescript/stoic-officegen/tactics/index.ts__fetchTactics',
];

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'];

    const errors = [];

    for (const filePath of filesPaths) {
      const { functions, content, lines } = index.byPath[filePath];

      for (const fn of functions) {
        if (!fn.isAsync) {
          continue;
        }

        const definitionStr = content.substr(fn.start, fn.end - fn.start);

        if (
          !definitionStr.includes('await ') &&
          !definitionStr.includes('Promise') &&
          !IGNORED.includes(`${filePath}__${fn.name}`)
        ) {
          const lineIndex = lines.findIndex((it) => it.includes(`function ${fn.name}(`));
          errors.push({
            filePath,
            line: lineIndex > -1 ? lineIndex + 1 : null,
            message: `'${fn.name}': remove async ${filePath}__${fn.name}`,
          });
        }
      }
    }

    return { errors };
  },
};
