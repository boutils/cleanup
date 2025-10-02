const IGNORED = [
  'src/libs/signals-store.ts__getOrFetchSignals',
  'src/libs/worker/libs/instruments.worker.ts__searchInstruments',
  'src/libs/worker/libs/signals.worker.ts__getOrFetchSignals',
  'src/libs/worker/libs/intraday-data.worker.ts__fetchIntradayData',
  'src/libs/worker/libs/quanta-metadata.worker.ts__fetchQuantaMetadataModels',
  'src/libs/worker/libs/regimes-events-schema.worker.ts__fetchRegimesSchema',
  'src/libs/worker/libs/ticker-relations.worker.ts__computeTickerRelations',
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
