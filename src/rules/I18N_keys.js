import { computeRelatedLibPath, computeRelatedVuePath, computeRelatedVmcPath } from '../utils.js';

export default {
  validate: (index) => {
    const filesPaths = index.byType['json']; //.filter((it) => it.includes('stoic-notebooks.i18n.json'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { content } = index.byPath[filePath];

      if (!filePath.endsWith('.i18n.json') || filePath.endsWith('common.i18n.json')) {
        continue;
      }

      const json = JSON.parse(content);
      const vuePath = computeRelatedVuePath(filePath);
      const vmcPath = computeRelatedVmcPath(filePath);
      const libPath = computeRelatedLibPath(filePath, true);
      const { content: vueContent } = index.byPath[vuePath] || {};
      const { content: vmcContent } = index.byPath[vmcPath] || {};
      const { content: libContent } = index.byPath[libPath] || {};
      const keys = extractKeyNames(json);

      for (const key of keys) {
        if (
          !vueContent?.includes(key) &&
          !vmcContent?.includes(key) &&
          !libContent?.includes(key) &&
          !vueContent.match(/i18n.*\[/) &&
          !vmcContent.match(/i18n.*\[/) &&
          !vmcContent.includes('makeTranslator') &&
          !libContent?.match(/i18n.*\[/) &&
          !libContent?.includes('makeTranslator')
        ) {
          errors.push({
            filePath: filePath,
            line: null,
            message: `Remove unused i18n key '${key.substr(5)}'. It is not used.`,
          });
        }
      }
    }

    return { errors };
  },
};

function extractKeyNames(object, key = 'i18n') {
  const results = [];
  if (typeof object !== 'object' || object.en) {
    results.push(key);
  } else {
    for (const [localKey, value] of Object.entries(object)) {
      if (typeof value === 'object') {
        results.push(...extractKeyNames(value, `${key ? key + '.' : ''}${localKey}`));
      }
    }
  }

  return results;
}
