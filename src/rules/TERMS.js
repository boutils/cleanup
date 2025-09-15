import { getSortingError } from '../utils.js';

const TERMS_PATH = 'src/metadata/terms.ts';

export default {
  validate: (index) => {
    const termFile = index.byPath[TERMS_PATH];

    const terms = {};
    const termIds = [];

    if (termFile) {
      for (const line of termFile.lines) {
        if (line.includes('{ icon: ')) {
          const split = line.split(':');
          const term = split[0].replaceAll("'", '').trim();
          const icon = split[split.length - 1].replaceAll("'", '').replaceAll(',', '').replaceAll('}', '').trim();
          terms[icon] ??= [];
          terms[icon].push(term);
          termIds.push(term);
        }
      }
    }

    const errors = [];

    if (Object.keys(terms).length === 0) {
      errors.push({
        filePath: TERMS_PATH,
        line: null,
        message: 'Terms file is empty or does not contain any terms with icons.',
      });

      return { errors };
    }

    const sortingError = getSortingError(termIds);
    if (sortingError) {
      errors.push({
        filePath: TERMS_PATH,
        message: `Sorting: ${sortingError}`,
      });
    }

    for (const [icon, term] of Object.entries(terms)) {
      if (term.length > 1) {
        errors.push({
          filePath: TERMS_PATH,
          line: null,
          message: `Icon '${icon}'is used several times in terms: [${term}]`,
        });
      }
    }

    return { errors };
  },
};
