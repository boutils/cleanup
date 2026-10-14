import { computeRelatedVmcPath } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['template'].concat(index.byType['vue']);

    const refs = collectRunsAfter(index.allContent, '$refs.');
    const optionalRefs = collectRunsAfter(index.allContent, '$refs?.');

    const errors = [];
    for (const filePath of filesPaths) {
      const { linesInfo } = index.byPath[filePath];

      const vmcPath = computeRelatedVmcPath(filePath);
      const { content: vmcContent } = index.byPath[vmcPath] || {};

      for (const lineInfo of linesInfo) {
        if (lineInfo.isCommentedLine) {
          continue;
        }

        if (
          !lineInfo.attributeNames.includes('ref') ||
          isReferenced(refs, index.allContent, '$refs.', lineInfo.attributeValue) ||
          isReferenced(optionalRefs, index.allContent, '$refs?.', lineInfo.attributeValue)
        ) {
          continue;
        }

        if (
          !lineInfo.isVueBinding &&
          !vmcContent.includes(`this.$refs.${lineInfo.attributeValue}`) &&
          !vmcContent.includes('= this.$refs;')
        ) {
          errors.push({
            filePath: filePath,
            line: lineInfo.lineNumber,
            message: `Remove unused REF named '${lineInfo.attributeValue}'. It is not used in the component.`,
          });
          continue;
        } else if (lineInfo.isVueBinding && !vmcContent.includes('this.$refs')) {
          errors.push({
            filePath: filePath,
            line: lineInfo.lineNumber,
            message: `Remove unused dynamic REF '${lineInfo.attributeValue}'. It is not used in the component.`,
          });
        }
      }
    }

    return { errors };
  },
};

// `allContent.includes(prefix + value)` holds iff the identifier run right after some `prefix` starts with `value`;
// values with other characters fall back to the plain scan.
function isReferenced(runs, allContent, prefix, value) {
  if (!/^[A-Za-z0-9_$]*$/.test(value)) {
    return allContent.includes(prefix + value);
  }

  if (runs.has(value)) {
    return true;
  }

  for (const run of runs) {
    if (run.startsWith(value)) {
      return true;
    }
  }

  return false;
}

function collectRunsAfter(allContent, prefix) {
  const runs = new Set();
  const run = /[A-Za-z0-9_$]*/y;

  for (let from = allContent.indexOf(prefix); from !== -1; from = allContent.indexOf(prefix, from + 1)) {
    run.lastIndex = from + prefix.length;
    runs.add(run.exec(allContent)[0]);
  }

  return runs;
}
