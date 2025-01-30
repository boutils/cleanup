const EMIT_STR = 'emits:';

const ignoredFiles = [
  'libs/typescript/components/stoic-charts-layout/components/stoic-chart-horizontal/lib/stoic-chart-horizontal.vmc.ts',
  'libs/typescript/components/stoic-charts-layout/components/stoic-chart-main/lib/stoic-chart-main.vmc.ts',
];

export default {
  validate: (index) => {
    const emitsByComponent = {};

    // Browse VMC files to find $emit
    const vmcfilesPaths = index.byType['vmc'];
    for (const filePath of vmcfilesPaths) {
      const { declared, found, lineIndex } = extractEmitsFromVMCFile(filePath, index);
      const componentId = filePath.split('/').pop().replace('.vmc.ts', '');
      emitsByComponent[componentId] ??= { declared, found, filePath, lineIndex };
    }

    // Browse VUE files to find $emit
    const vuefilesPaths = index.byType['vue'];
    for (const filePath of vuefilesPaths) {
      const { found } = extractEmitsFromVUEFile(filePath, index);
      const componentId = filePath.split('/').pop().replace('.vue', '');

      emitsByComponent[componentId] ??= { declared: [], found: [] };
      emitsByComponent[componentId].found.push(...found);
    }

    // Collect errors
    const errors = [];
    for (const [, result] of Object.entries(emitsByComponent)) {
      if (!result.found && !result.declared) {
        continue;
      }

      const found = remove_duplicates(result.found || []).sort();
      const declared = result.declared || [];

      const diff = declared.filter((x) => !found.includes(x)).concat(found.filter((x) => !declared.includes(x)));

      if (diff.length > 0 && !ignoredFiles.includes(result.filePath)) {
        const foundStr = JSON.stringify(found);
        const message = found.length > 0 ? `Emits should be updated to: '${foundStr}'` : 'Emits should be removed!';

        errors.push({
          filePath: result.filePath,
          line: result.lineIndex ? result.lineIndex + 1 : null,
          message,
        });
      }
    }

    return { errors };
  },
};

function extractEmitsFromVMCFile(filePath, index) {
  const { lines } = index.byPath[filePath];
  let isInsideEmits = false;
  const extraction = { found: [], declared: [], lineIndex: null };
  const existingEmits = [];

  for (const [lineIndex, line] of lines.entries()) {
    if (line.trim().startsWith(EMIT_STR)) {
      extraction.lineIndex = lineIndex;
      if (line.includes('],')) {
        const str = line.substr(line.indexOf(EMIT_STR) + EMIT_STR.length);

        const emitsInline = str.substr(0, str.indexOf('],') + 1).trim();
        existingEmits.push(...eval(emitsInline));
      } else {
        isInsideEmits = true;
        continue;
      }
    }

    if (isInsideEmits) {
      if (line === '  ],') {
        isInsideEmits = false;
      } else {
        existingEmits.push(eval(line.replace(',', '').trim()));
      }
    }

    if (line.includes('$emit(')) {
      const str = line.substr(line.indexOf('$emit(') + 6);
      if (str[0] === "'") {
        const str2 = str.substr(1);
        const action = str2.substr(0, str2.indexOf("'"));

        extraction.found.push(action);
      }
    }
  }

  if (existingEmits.length) {
    extraction['declared'] = existingEmits;
  }

  return extraction;
}

function extractEmitsFromVUEFile(filePath, index) {
  const extraction = { found: [] };
  const { linesInfo } = index.byPath[filePath];
  for (const lineInfo of linesInfo) {
    if (lineInfo.hasEmit) {
      const str = lineInfo.line.substr(lineInfo.line.indexOf("$emit('") + 7);
      const action = str.substr(0, str.indexOf("'"));
      extraction.found.push(action);
    }
  }

  return extraction;
}

function remove_duplicates(arr) {
  let s = new Set(arr);
  let it = s.values();
  return Array.from(it);
}
