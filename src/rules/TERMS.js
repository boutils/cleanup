const TERMS_PATH = 'libs/typescript/components/shared/theme/terms.ts';
export default {
  validate: (index) => {
    const { lines } = index.byPath[TERMS_PATH];

    const terms = {};
    for (const line of lines) {
      if (line.includes('{ icon: ')) {
        const split = line.split(':');
        const term = split[0].replaceAll("'", '').trim();
        const icon = split[split.length - 1].replaceAll("'", '').replaceAll(',', '').replaceAll('}', '').trim();
        terms[icon] ??= [];
        terms[icon].push(term);
      }
    }

    const errors = [];
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
