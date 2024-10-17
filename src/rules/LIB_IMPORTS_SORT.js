export default {
  validate: (index) => {
    // Check VMC & VUE files
    const filesPaths = index.byType['lib'];

    const errors = [];
    for (const filePath of filesPaths) {
      const { imports } = index.byPath[filePath];
      const res = computeOrderedImports(imports);

      for (const [i, r] of res.entries()) {
        if (r.line !== imports[i].line) {
          const expectedPosition = res.findIndex((it) => it.line === r.line);
          errors.push({
            filePath,
            line: imports[i].lineNumber,
            message: `IMPORT '${imports[i].line}' should be after '${imports[expectedPosition + 1].line}'`,
          });

          break;
        }
      }
    }

    return { errors };
  },
};

function computeOrderedImports(imports) {
  let absoluteImports = [];
  let relativeImports = [];

  for (const imp of imports) {
    const str = extractStringToSort(imp);
    if (str.startsWith('.')) {
      relativeImports.push(imp);
    } else {
      absoluteImports.push(imp);
    }
  }

  absoluteImports = absoluteImports.sort((a, b) => {
    return extractStringToSort(a) >= extractStringToSort(b) ? 1 : -1;
  });
  relativeImports = relativeImports.sort((a, b) => {
    return extractStringToSort(a) >= extractStringToSort(b) ? 1 : -1;
  });

  return [...absoluteImports, ...relativeImports];
}

function extractStringToSort(str) {
  return str.line.substr(str.line.indexOf('from ') + 6).toLowerCase();
}
