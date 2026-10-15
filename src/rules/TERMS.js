import { getSortingError } from '../utils.js';

const IGNORED = ['promote'];

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

    const usages = collectUsages(index.allContent);

    for (const [term, value] of Object.entries(index.terms.items)) {
      const split = value.split(' ');
      const icon = split[split.length - 1];
      termsList[icon] ??= [];
      termsList[icon].push(term);

      const firstPart = term.split('-')[0];
      if (
        !usages.icon.has(term) &&
        !usages.getIcon.has(term) &&
        !usages.colonDoubleQuoted.has(term) &&
        !usages.colonSingleQuoted.has(term) &&
        !usages.ternary.has(term) &&
        !usages.returned.has(term) &&
        !usages.iconTemplate.has(firstPart) &&
        !IGNORED.includes(term)
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

// Each set holds every string found between a fixed prefix and the next occurrence of its suffix, so `set.has(term)` is
// equivalent to `allContent.includes(prefix + term + suffix)` without rescanning 13 MB for every term.
function collectUsages(allContent) {
  return {
    icon: collectBetween(allContent, "$icon('", "')"),
    getIcon: collectBetween(allContent, "getIcon('", "')"),
    colonDoubleQuoted: collectBetween(allContent, ': "', '"'),
    colonSingleQuoted: collectBetween(allContent, ": '", "'"),
    ternary: collectBetween(allContent, "? '", "'"),
    returned: collectBetween(allContent, "return '", "'"),
    iconTemplate: collectBetween(allContent, 'icon: `', '-$'),
  };
}

function collectBetween(content, prefix, suffix) {
  const values = new Set();

  for (let from = content.indexOf(prefix); from !== -1; from = content.indexOf(prefix, from + 1)) {
    const start = from + prefix.length;
    const end = content.indexOf(suffix, start);
    if (end === -1) {
      break;
    }

    values.add(content.slice(start, end));
  }

  return values;
}
