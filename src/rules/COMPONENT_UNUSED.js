const IGNORED_COMPONENTS = ['stoic-middleware', 'stoic-comparator-field-node'];
import { camelize } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['vue'];

    const tagStarts = collectRunsAfter(index.allContent, '<');
    const quoted = collectQuoted(index.allContent);

    const errors = [];
    for (const filePath of filesPaths) {
      const componentName = filePath.split('/').pop().replace('.vue', '');
      const componentNameCamelized = camelize(componentName);

      if (
        !startsWithAny(tagStarts, componentName) &&
        !IGNORED_COMPONENTS.includes(componentName) &&
        !quoted.has(componentNameCamelized)
      ) {
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

// `allContent.includes('<' + name)` holds iff the identifier run right after some `<` starts with `name`.
function collectRunsAfter(allContent, prefix) {
  const runs = new Set();
  const run = /[A-Za-z0-9_-]*/y;

  for (let from = allContent.indexOf(prefix); from !== -1; from = allContent.indexOf(prefix, from + 1)) {
    run.lastIndex = from + prefix.length;
    runs.add(run.exec(allContent)[0]);
  }

  return runs;
}

// `allContent.includes("'" + name + "'")` holds iff `name` is the text between two consecutive single quotes.
function collectQuoted(allContent) {
  const values = new Set();

  for (let from = allContent.indexOf("'"); from !== -1; from = allContent.indexOf("'", from + 1)) {
    const end = allContent.indexOf("'", from + 1);
    if (end === -1) {
      break;
    }

    values.add(allContent.slice(from + 1, end));
  }

  return values;
}

function startsWithAny(runs, name) {
  if (runs.has(name)) {
    return true;
  }

  for (const run of runs) {
    if (run.startsWith(name)) {
      return true;
    }
  }

  return false;
}
