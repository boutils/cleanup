import { getSortingError } from '../utils.js';

export default {
  validate: (index) => {
    const errors = [];

    if (!index.terms) {
      errors.push({
        filePath: 'Terms',
        line: null,
        message: `No terms found in index.`,
      });

      return { errors };
    }

    const terms = index.terms.items;
    const termsIds = Object.keys(terms);
    const termsList = {};

    for (const [term, value] of Object.entries(index.terms.items)) {
      const split = value.split(' ');
      const icon = split[split.length - 1];
      termsList[icon] ??= [];
      termsList[icon].push(term);

      if (
        !index.allContent.includes(`$icon('${term}')`) &&
        !index.allContent.includes(`getIcon('${term}')`) &&
        !index.allContent.includes(`: "${term}"`) &&
        !index.allContent.includes(`: '${term}'`) &&
        !index.allContent.includes(`? '${term}'`) &&
        !index.allContent.includes(`return '${term}'`)
      ) {
        errors.push({
          filePath: index.terms.path,
          line: null,
          message: `Terms '${term}' is not used. Please remove it.`,
        });
      }
    }

    //console.log(termsList);

    if (termsIds.length === 0) {
      errors.push({
        filePath: index.terms.path,
        line: null,
        message: 'Terms file is empty or does not contain any terms with icons.',
      });

      return { errors };
    }

    const sortingError = getSortingError(termsIds);
    if (sortingError) {
      errors.push({
        filePath: index.terms.path,
        message: `Sorting: ${sortingError}`,
      });
    }

    for (const [icon, terms] of Object.entries(termsList)) {
      if (terms.length > 1) {
        errors.push({
          filePath: index.terms.path,
          line: null,
          message: `Icon '${icon}'is used several times in terms: [${terms}]`,
        });
      }
    }

    return { errors };
  },
};
