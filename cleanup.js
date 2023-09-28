/*
TODOS:
Clean test files => remove filter((it) => !it.endsWith('.test.mjs'))
Remove "actions" from all spec files
Check that importedComponents are used
Order `cases` in switch
Sort `components` in VMC files
vmc attribute validation and order (props, methods,...)
wrong attribute name => `class` is valid but `classes` is not
Check name for every vmc
find empty class
find not used components
find not used sequences => expectAssetRichTooltipLayerName
find stoa key not used
Check arguments for every helper function
*/

const fs = require('fs');
const Vuedoc = require('@vuedoc/parser');
const JavascriptLoader = require('@vuedoc/parser/loader/javascript.js');
const { exec } = require('child_process');
const { parse, stringify } = require('scss-parser');

const AUTOMATIC_FIX = false;
const DIRECTORY = './ui';
const DEFAULT_COLOR = '\x1b[0m';
const COLOR_FROM_TYPE = {
  comment: '\x1b[36m%s\x1b[0m',
  error: '\x1b[31m%s\x1b[0m',
  info: '\x1b[1m%s\x1b[0m',
  ok: '\x1b[32m%s\x1b[0m',
  warning: '\x1b[33m%s\x1b[0m',
};
const TAG_WITHOUT_CLOSE = new Set(['img', 'input', 'br', 'hr']);
const SECTION_SEPARATOR = '// -------------------------------------------------------------------------';

const warnings = {};
const info = {};
function addWarning(file, lineNumber, type, message) {
  warnings[file] = warnings[file] || [];
  warnings[file].push({ lineNumber, type, message });
}

function addInfo(file, lineNumber, type, message) {
  info[file] = info[file] || [];
  info[file].push({ lineNumber, type, message });
}

async function checker() {
  await checkVMCFiles();
  await checkVUEFiles();
  await checkCSSFiles();
  await checkJSFiles();
  await checkJSonFiles();
  await checkExports();
  await checkFunctions();
}

function checkFunctionInFile(filePath, fn) {
  const fileContent = filesContents[filePath];
  if (!fileContent) {
    return;
  }

  const isVueFile = filePath.endsWith('.vue');
  const lines = fileContent.split('\n');
  for (const [lineIndex, line] of lines.entries()) {
    const indexStart = line.indexOf(`${fn.name}(`);
    const isExternalCallToLibFn = line.includes(`lib.${fn.name}(`);

    if (
      indexStart > -1 &&
      !line.includes('function') &&
      (line.endsWith(',') || line.includes(';') || (isVueFile && isExternalCallToLibFn)) &&
      (!line.includes(`.${fn.name}(`) || isExternalCallToLibFn)
    ) {
      const argsStartString = replaceObjectArgs(line.substring(indexStart + `${fn.name}`.length));
      const argsString = argsStartString.substring(0, argsStartString.indexOf(')'));
      const args = argsString.split(',');
      const totalArgs = fn.requiredArgsCount + fn.optionalArgsCount;
      if (args.length > totalArgs) {
        addWarning(
          filePath,
          lineIndex + 1,
          'function call',
          `The function '${fn.name}' accepts only ${totalArgs} args but have ${args.length}`
        );
      } else if (args.length < fn.requiredArgsCount) {
        addWarning(
          fn.filePath,
          fn.line,
          'function declaration',
          `The function '${fn.name}' has ${fn.requiredArgsCount} required args but is called sometimes with ${args.length}`
        );
      }
    }
  }
}

const allFunctions = {};
async function checkFunctions() {
  const jsFilePaths = getFilesFromDirectory(DIRECTORY, '.mjs');
  for (const filePath of jsFilePaths) {
    const fileContent = filesContents[filePath];
    const lines = fileContent.split('\n');
    let areExportFunctionsDeclaredFirst = true;
    let isExported = true;
    let errorReportedForCurrentFile = false;

    for (const [lineIndex, rawLine] of lines.entries()) {
      const line = rawLine.trim();

      if (!line.startsWith('export function ') && !line.startsWith('function ')) {
        continue;
      }

      const fnInfo = parseFunction(filePath, lines, lineIndex + 1);

      allFunctions[`${filePath}/${fnInfo.name}`] = fnInfo;
      if (fnInfo.error) {
        addWarning(filePath, lineIndex + 1, 'function declaration', fnInfo.error);
      }

      if (fnInfo.exported) {
        if (!isExported && !errorReportedForCurrentFile) {
          errorReportedForCurrentFile = true;
          addWarning(
            filePath,
            lineIndex + 1,
            'function declaration',
            `Exported function '${fnInfo.name}' should be before private function`
          );
        }
      } else {
        isExported = false;
      }
    }
  }

  for (const filePath of jsFilePaths) {
    for (const importLine of importsLines[filePath]) {
      if (!importLine.line.includes('uiLib/')) {
        continue;
      }

      const lookupPath = importLine.line
        .replace(importLine.line.substring(0, importLine.line.indexOf('uiLib/') + 'uiLib/'.length), './ui/lib/')
        .replace("';", '');

      const hasStar = importLine.line.includes('*');
      const relatedFunctions = Object.values(allFunctions).filter(
        (it) => it.filePath === lookupPath && (hasStar || importLine.line.includes(it.name))
      );

      for (const fn of relatedFunctions) {
        checkFunctionInFile(filePath, fn);
      }
    }
  }

  for (const fn of Object.values(allFunctions)) {
    if (fn.isComponentFunction) {
      checkFunctionInFile(fn.filePath, fn);

      const pathArray = fn.filePath.split('/');
      const componentName = pathArray[pathArray.length - 1].replace('.lib.mjs', '');
      pathArray[pathArray.length - 1] = componentName + '.vmc.mjs';
      const vmcFilePath = pathArray.join('/');
      checkFunctionInFile(vmcFilePath, fn);

      pathArray.splice(-1);
      pathArray[pathArray.length - 1] = componentName + '.vue';
      const vueFilePath = pathArray.join('/');
      checkFunctionInFile(vueFilePath, fn);
    }
  }
}

function replaceObjectArgs(string) {
  const before = string.substr(0, string.indexOf('(') + 1);
  string = string.substring(before.length);
  const separators = [
    { start: '(', end: ')', replacement: '' },
    { start: '{', end: '}', replacement: 'null' },
    { start: '[', end: ']', replacement: 'null' },
  ];

  for (const separator of separators) {
    let objectIndex = string.indexOf(separator.start);
    while (objectIndex > -1 && objectIndex < string.length - 1) {
      let countStart = 1;
      const substr = string.substring(objectIndex + 1);
      const chars = substr.split('');
      for (const [charPos, char] of chars.entries()) {
        if (char === separator.start) {
          countStart++;
        } else if (char === separator.end) {
          countStart--;
          if (countStart === 0) {
            const toRep = string.substring(objectIndex, objectIndex + charPos + 2);
            string = string.replace(toRep, separator.replacement);
            objectIndex = string.indexOf(separator.start);
            break;
          }
        } else if (chars.length - 1 === charPos) {
          objectIndex = -1;
        }
      }
    }
  }

  return before + string;
}

function parseFunction(filePath, lines, lineNumber) {
  const result = {
    filePath,
    isComponentFunction: filePath.includes('components/') && filePath.endsWith('.lib.mjs'),
    line: lineNumber,
    name: null,
    args: [],
    exported: false,
    requiredArgsCount: 0,
    optionalArgsCount: 0,
    error: null,
  };
  const line = lines[lineNumber - 1];
  let clean = line;
  let isEnded = line.includes(') {');
  let lineIt = lineNumber;
  while (!isEnded) {
    clean += lines[lineIt];
    lineIt++;
    isEnded = clean.includes(') {');
  }

  if (clean.startsWith('export')) {
    clean = clean.substring(7);
    result.exported = true;
  }

  if (clean.startsWith('function')) {
    clean = clean.substring(9);
  }

  if (clean.endsWith('{')) {
    clean = clean.substring(0, clean.length - 1);
  }

  clean = clean.trim();
  clean = replaceObjectArgs(clean);

  const start = clean.indexOf('(');
  const end = clean.lastIndexOf(')');
  result.name = clean.substring(0, start);
  const args = clean.substring(start + 1, end).split(',');
  result.args = args.map((txt, i) => {
    txt = txt.trim();
    const isOptional = txt.includes('=');

    if (isOptional) {
      result.optionalArgsCount++;
    } else {
      if (result.optionalArgsCount > 0) {
        result.error = 'Move optional arguments at the end';
      }

      result.requiredArgsCount++;
    }

    return {
      name: isOptional ? txt.substring(0, txt.indexOf('=')).trim() : txt,
      txt,
      required: !isOptional,
      position: i + 1,
    };
  });

  return result;
}

const filesContents = {};
const importsLines = {};
function readAndIndexFiles() {
  const files = getFilesFromDirectory(DIRECTORY).concat(getFilesFromDirectory('./test', '.mjs'));
  for (const file of files) {
    if (file.includes('.ts')) {
      continue;
    }

    filesContents[file] = fs.readFileSync(file, { encoding: 'utf8', flag: 'r' });
    importsLines[file] = getAndCheckImportLines(file);
  }
}

function findCSSBlockError(blocks) {
  const errors = [];
  for (const block of blocks) {
    const error = getSortingError(
      block.map((it) => it.value),
      block[0].line + block.length
    );
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

const IGNORED_CLASSES = ['active', 'sd-grid', 'sd-draggable-drag-in-progress', 'theme--dark'];
function getCSSClasses(ast, ignoreDeep = false) {
  let classes = [];

  if (ast.type === 'class') {
    classes = ast.value.map((it) => it.value);
  }

  if (Array.isArray(ast.value)) {
    if (
      ast.type === 'rule' &&
      ignoreDeep &&
      ast.value[0].type === 'selector' &&
      ast.value[0].value[0].type === 'function' &&
      ast.value[0].value[0].value[0].value[0].value === 'deep'
    ) {
      return [];
    }

    for (const subAst of ast.value) {
      classes.push(...getCSSClasses(subAst, ignoreDeep));
    }
  }

  return classes.filter((it) => !IGNORED_CLASSES.includes(it) && !it.startsWith('v-'));
}

function getSCSSBlocks(ast) {
  if (ast.type !== 'block') {
    const blocks = [];
    for (const v of ast.value) {
      if (typeof v === 'object') {
        const subBlocks = getSCSSBlocks(v);
        if (subBlocks.length > 0) {
          blocks.push(...subBlocks);
        }
      }
    }

    return blocks;
  }

  const blocks = [];
  const block = [];
  for (const v of ast.value) {
    if (v.type === 'rule') {
      const subBlocks = getSCSSBlocks(v);
      if (subBlocks.length > 0) {
        blocks.push(...subBlocks);
      }
    }

    if (v.type !== 'declaration') {
      continue;
    }

    for (const declaration of v.value) {
      if (declaration.type !== 'property') {
        continue;
      }

      for (const d of declaration.value) {
        if (d.type !== 'identifier') {
          continue;
        }

        if (declaration.value.length === 1) {
          block.push({ line: d.start.line, value: d.value });
        }
      }
    }
  }

  if (block.length > 0) {
    blocks.push(block);
  }

  return blocks;
}

async function checkCSSFiles() {
  const files = getFilesFromDirectory(DIRECTORY, '.scss');

  for (const file of files) {
    try {
      const data = filesContents[file];
      if (data.includes('v-deep')) {
        addWarning(file, null, 'deprecated', 'v-deep has been deprecated, replace this by `:deep(<inner-selector>)`');
      }
      const ast = parse(data);
      const blocks = getSCSSBlocks(ast);
      const sortingErrors = findCSSBlockError(blocks);
      if (sortingErrors) {
        for (sortingError of sortingErrors) {
          addWarning(file, sortingError.lineNumber, 'sorting', sortingError.message);
        }
      }

      const pathArray = file.split('/');
      const vueFileName = pathArray[pathArray.length - 1].replace('.scss', '.vue');
      const vueFilePath = pathArray
        .slice(0, pathArray.length - 2)
        .concat(vueFileName)
        .join('/');
      const vueFileContent = filesContents[vueFilePath];

      if (vueFileContent && !vueFileContent.includes(':class') && !vueFileContent.includes(':content-class')) {
        const classes = getCSSClasses(ast, true);
        for (const class_ of classes) {
          if (!filesContents[vueFilePath].includes(class_) && !IGNORE_CLASSES.includes(class_)) {
            addWarning(file, class_.line, 'unused class', `Remove class '${class_}'. It is not used.`);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

const IGNORE_FILES = [
  './test/lib/fermat/assemblyscript/binder.test.mjs',
  './test/lib/fermat/data/periods-filter.test.mjs',
  './test/lib/fermat/utils/runner.mjs',
  './test/lib/fermat/utils/workbook-runner-3.mjs',
  './ui/generated/stoapedia-demo-specs.mjs',
  './ui/generated/stoapedia-specs.mjs',
];

async function checkJSFiles() {
  //const filePaths = getFilesFromDirectory(DIRECTORY, '.mjs');
  const filePaths = getFilesFromDirectory(DIRECTORY, '.mjs')
    .concat(getFilesFromDirectory('./test/ui', '.mjs'))
    .filter((it) => !IGNORE_FILES.includes(it));

  for (const filePath of filePaths) {
    checkImports(filePath);

    const file = filesContents[filePath];
    const lines = file.split('\n');
    const linesInfo = [];

    let isInsideAsyncFn = false;
    let asyncFnLineIndex = -1;
    let hasAwait = false;
    let countCurlyBracket = 0;
    let fnIndex = -1;
    let newLines = lines.slice();
    for (const [lineIndex, line] of lines.entries()) {
      if (line.includes('() =>')) {
        fnIndex = lineIndex;
      }

      if (line.includes('await ') && !line.includes('await import') && !isInsideAsyncFn) {
        addWarning(filePath, fnIndex + 1, 'ASYNC', `Add 'async' here`);

        if (AUTOMATIC_FIX) {
          newLines = [
            ...newLines.slice(0, fnIndex),
            newLines[fnIndex].replace('() =>', 'async () =>'),
            ...newLines.slice(fnIndex + 1),
          ];
          fs.writeFileSync(filePath, newLines.join('\n'));
        }
      }

      if (line.includes('async ')) {
        isInsideAsyncFn = true;
        asyncFnLineIndex = lineIndex;
        countCurlyBracket = 1;
        hasAwait = false;
      } else if (isInsideAsyncFn && (line.includes('}') || line.includes('{'))) {
        countCurlyBracket = countCurlyBracket + (line.match(/{/g)?.length || 0) - (line.match(/}/g)?.length || 0);
        if (countCurlyBracket === 0) {
          isInsideAsyncFn = false;
          if (!hasAwait) {
            addWarning(filePath, asyncFnLineIndex + 1, 'ASYNC', `Remove 'async'`);

            if (AUTOMATIC_FIX) {
              newLines = [
                ...newLines.slice(0, asyncFnLineIndex),
                newLines[asyncFnLineIndex].replace('async', ''),
                ...newLines.slice(asyncFnLineIndex + 1),
              ];
              fs.writeFileSync(filePath, newLines.join('\n'));
            }
          }
        }
      }

      if (line.includes('await ')) {
        hasAwait = true;
      }

      const previousLineInfo = linesInfo[lineIndex - 1] || {};
      const lineNumber = lineIndex + 1;
      const lineInfo = computeHTMLLineInfo(line, lineNumber, -1, previousLineInfo);

      const trim = line?.trim();
      if (
        line.length > 0 &&
        !trim.startsWith('}') &&
        !trim.startsWith(')') &&
        !trim.startsWith(':') &&
        !trim.startsWith('break;') &&
        previousLineInfo?.line?.trim() === '}'
      ) {
        addWarning(filePath, lineNumber, 'empty line', 'Add an empty line');
      }

      linesInfo.push(lineInfo);
      checkAndShortAnd(filePath, lineInfo.line, lineNumber);
      checkLineBackTicks(filePath, lineInfo, lineNumber);
    }

    if (!IGNORE_FILES.includes(filePath)) {
      checkSwitchCase(filePath, lines);
    }
  }
}

async function checkExports() {
  const jsFilePaths = getFilesFromDirectory(DIRECTORY, '.mjs').concat(getFilesFromDirectory('./test', '.mjs'));
  let jsAndVueFilePaths = getFilesFromDirectory(DIRECTORY, '.mjs')
    .concat(getFilesFromDirectory('./test', '.mjs'))
    .concat(getFilesFromDirectory(DIRECTORY, '.vue'));

  const _exports = {};
  for (const filePath of jsFilePaths) {
    if (!IGNORE_FILES.includes(filePath)) {
      accumulateExports(_exports, filePath);
    }
  }

  for (const [keyword, _export] of Object.entries(_exports)) {
    const isFound = false;
    for (const filePath of jsAndVueFilePaths) {
      const file = filesContents[filePath];
      if (file.includes(keyword) && filePath !== _export.file) {
        _export.used = true;
        break;
      }
    }
  }

  for (const [keyword, _export] of Object.entries(_exports)) {
    if (!_export.used) {
      addWarning(_export.file, _export.lineNumber, 'EXPORT', `'export' keyword should be removed before '${keyword}'`);
    }
  }
}

function accumulateExports(_exports, filePath) {
  const file = filesContents[filePath];
  const lines = file.split('\n');

  for (const [lineIndex, line] of lines.entries()) {
    const trimmedLine = line.trim();
    if (
      (!trimmedLine.startsWith('export') && !trimmedLine.startsWith('import')) ||
      filePath.includes('dom-helpers.mjs') ||
      trimmedLine.startsWith('export {')
    ) {
      continue;
    }

    if (trimmedLine.startsWith('export const') && !trimmedLine.startsWith('export const {')) {
      const keyword = computeExportKeyword('export const', trimmedLine, ' =');
      _exports[keyword] = { used: false, file: filePath, lineNumber: lineIndex + 1 };
    } else if (trimmedLine.startsWith('export function*')) {
      const keyword = computeExportKeyword('export function*', trimmedLine, '(');
      _exports[keyword] = { used: false, file: filePath, lineNumber: lineIndex + 1 };
    } else if (trimmedLine.startsWith('export function')) {
      const keyword = computeExportKeyword('export function', trimmedLine, '(');
      _exports[keyword] = { used: false, file: filePath, lineNumber: lineIndex + 1 };
    }
  }
}

function computeExportKeyword(key, line, delimiter) {
  const startIndex = line.indexOf(key) + key.length + 1;
  return line.substr(startIndex, line.indexOf(delimiter) - startIndex);
}

function camalize(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, function (match, chr) {
    return chr.toUpperCase();
  });
}

let vmcFiles = {};
async function checkVMCFiles() {
  const files = getFilesFromDirectory(DIRECTORY, '.vmc.mjs');

  for (const file of files) {
    try {
      const pathArray = file.split('/');
      const componentName = pathArray[pathArray.length - 1].replace('.vmc.mjs', '');
      const results = await Vuedoc.parse({ filename: file, loaders: [Vuedoc.Loader.extend('mjs', JavascriptLoader)] });
      const properties = ['props', 'data', 'computed', 'methods'];
      const data = filesContents[file];
      vmcFiles[componentName] = { ...results, _text: data };
      const isFileWithSection = data.includes(SECTION_SEPARATOR);
      if (!results.name?.endsWith('.vmc')) {
        const validComponentName = camalize(componentName);
        if (results.name !== validComponentName) {
          addWarning(
            file,
            null,
            'name',
            `Wrong VMC component name: replace '${results.name}' by '${validComponentName}'`
          );
        }
      }

      for (const property of properties) {
        const names = results[property].map((it) => it.name.replace(/-/g, ''));
        if (!file.includes('demo.vmc.mjs')) {
          checkUnusedProperty(property, names, file);
        }

        if (property === 'methods' && isFileWithSection) {
          continue;
        }

        const sortingErrors = getSortingError(names);
        if (sortingErrors) {
          addWarning(file, null, 'sorting', `${property} ${sortingErrors}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

const IGNORED_PROPS = ['sd-sheet__transfers'];

const PUBLIC_METHODS = [
  'sd-code-autocomplete__selectDown',
  'sd-code-autocomplete__selectUp',
  'sd-sheet__onJourneyEditorRecordUpdate',
  'sd-table-base__onGroupByAggregationUpdate',
  'sd-text-editable__setWriteMode',
  'stoic-journey-outline-recipe__onContainerClick',
  'stoic-journey-outline-recipe__onRightClick',
  'stoic-journey-outline-transform__optionsSpec',
  'stoic-palette__pushTextToSearchField',
  'stoic-view-composer-add-item__showActionsMenu',
  'stoic-view-composer-toolbar__showActionsMenu',
];
const METHODS_USED_BY_MIXINS = [
  'sd-name-dialog__forbiddenChars',
  'sd-name-dialog__emptynametext',
  'sd-table-base__columnconfiguration',
  'sd-table-base__isconfigurationformshown',
  'sd-table-base__waitForGridReady',
];

function checkUnusedProperty(property, names, vmcFile) {
  if (names.length === 0) {
    return;
  }

  const pathArray = vmcFile.split('/');
  const fileName = pathArray[pathArray.length - 1].replace('.vmc.mjs', '');
  const offset = pathArray[pathArray.length - 2] === 'lib' ? 2 : 1;
  const vueFile = pathArray
    .slice(0, pathArray.length - offset)
    .concat(fileName + '.vue')
    .join('/');

  const vmcFileContent = filesContents[vmcFile];
  const vueFileContent = filesContents[vueFile];

  const vmcText = property === 'props' ? vmcFileContent.toLowerCase() : vmcFileContent;
  const vueText = property === 'props' ? vueFileContent.toLowerCase() : vueFileContent;

  for (const name of names) {
    const _name = `${fileName}__${name}`;
    if (IGNORED_PROPS.includes(_name) || PUBLIC_METHODS.includes(_name) || METHODS_USED_BY_MIXINS.includes(_name)) {
      continue;
    }

    const hasInVMC = [...vmcText.matchAll(new RegExp(name, 'g'))].length > 1 || vmcText.includes('this[');
    if (!vueText.includes(name) && !hasInVMC && name !== 'prefixid' && name !== 'isidentifier') {
      addWarning(vmcFile, null, `unused ${property}`, `'${name}' in ' ${property}' is not used (${_name})`);
    }
  }
}

function checkLineSingleQuotes(file, lineInfo, lineNumber) {
  const { line } = lineInfo;
  const hasSingleQuote = line.includes("'");

  if (hasSingleQuote) {
    const string = line.replace(/ /g, '');
    if (string.includes("='") && (line.match(/=/g) || []).length === 1) {
      addWarning(file, lineNumber, 'quote', 'Use double quotes instead of single"');
    }
  }
}

function checkLineBackTicks(file, lineInfo, lineNumber) {
  const { line } = lineInfo;
  const isVueFile = file.endsWith('.vue');
  if (isVueFile && lineInfo.hasBackTick && !lineInfo.hasDollar && !lineInfo.hasPipe) {
    addWarning(file, lineNumber, 'BackTick', `BackTick should be removed, there is no variable inside`);
    return;
  }

  if (isVueFile && lineInfo.hasBackTick && !lineInfo.isVueBinding && !lineInfo.hasMustacheCode) {
    addWarning(file, lineNumber, 'BackTick', `BackTick should be removed, this is not a vue binding`);
    return;
  }

  if (lineInfo.hasBackTick && !lineInfo.isCommentedLine && !line.includes('//')) {
    const singleQuotePos = line.indexOf("'");
    if ((singleQuotePos > -1 && singleQuotePos < line.indexOf('`')) || (line.match(/`/g) || []).length === 1) {
      return;
    }

    if (
      !file.includes('test/lib/kyu') &&
      !file.includes('test/lib/fermat') &&
      (!line.includes("'") || !file.endsWith('test.mjs')) &&
      (!line.includes('${') || (line.includes('`${') && line.includes('}`') && (line.match(/{/g) || []).length === 1))
    ) {
      addWarning(file, lineNumber, 'BackTick', 'BackTick should be removed"');
    }
  }
}

const SEPARATOR = [' ', ','];
function extractDynamicClassNames(input) {
  let str = input.trim().replace(':class', '');
  const classNames = [];
  let pos = str.indexOf(':');
  while (pos > -1) {
    const beforeString = str.substr(0, pos);
    for (const separator of SEPARATOR) {
      const last = beforeString.lastIndexOf(separator);
      if (last > -1 && last < pos) {
        const classStr = beforeString.substr(last + 1, pos);
        const className = classStr.replace(/'/g, '');
        if (className) {
          classNames.push(className);
        }

        str = str.substr(last + 2 + classStr.length);
        break;
      }
    }

    pos = str.indexOf(':');
  }

  return classNames;
}

function isMarginPaddingClass(className) {
  return className.length < 8 && (className.at(0) === 'p' || className.at(0) === 'm') && className.at(2) === '-';
}

function getClassListFromAttribute(attributeLine) {
  const start = attributeLine.indexOf('"') + 1;
  const str = attributeLine.substr(start, attributeLine.lastIndexOf('"') - start);

  if (attributeLine.includes(':class')) {
    if (attributeLine.includes('{')) {
      return extractDynamicClassNames(attributeLine);
    }

    return [];
  } else {
    return str.split(' ');
  }
}

const IGNORE_CLASSES = [
  'active',
  'disabled',
  'fill-height',
  'flex-column',
  'headline',
  'identifier',
  'title',
  'caption',
  'overline',
  'sd-column-selector',
  'sd-dropdown',
  'sd-expandable-list-item-action-sort-items',
  'sd-filter-rule-form',
  'sd-filtering-bar',
  'sd-filtering-bar-error',
  'sd-form-banner-bottom',
  'sd-form-control-slider',
  'sd-font-family-entry',
  'sd-icons-selector-icon',
  'sd-menu-item-sub-label',
  'sd-menu-item-description',
  'sd-menu-item-right-text',
  'sd-quality-bar',
  'sd-column-sparkchart',
  'sd-viewer-markdown',
  'sd-tooltip-slot-container',
  'stoic-notebook-editor-block-gutter',
  'stoic-notebook-editor-block-gutter-active',
  'stoic-notebook-editor-block-gutter-actions',
  'stoic-notebook-editor-block-gutter-buttons',
  'stoic-notebook-editor-block-gutter-close',
  'stoic-notebook-editor-block-gutter-close-pinned',
  'syntax',
  'table',
];
const CLASSES_USED_BY_TEST = [
  'demo-sd-delete-dialog-custom-message-input',
  'without-left-filtering-dots',
  'sd-conversation-comment',
  'sd-conversation-add-comment',
  'sd-data-structuring-step-action-button',
  'sd-description-tooltip-description',
  'sd-menu-item-slot',
  'sd-name-dialog-name-field',
  'sd-section-demo-slot',
  'sd-section-demo-custom-header-title',
  'sd-table-pagination-demo-page-count-slider',
  'sd-table-pagination-demo-page-length-slider',
  'sd-visual-demo-visual-selector',
  'sd-visual-placeholder-icon',
  'split-count-selector',
];

function isIgnoredClass(class_, file, lineNumber) {
  return (
    IGNORE_CLASSES.includes(class_) ||
    CLASSES_USED_BY_TEST.includes(class_) ||
    isMarginPaddingClass(class_) ||
    class_.endsWith('--text') ||
    class_.startsWith('elevation-') ||
    class_.startsWith('v-') ||
    class_.startsWith('body-') ||
    class_.startsWith('display-') ||
    class_.startsWith('subtitle-') ||
    class_.startsWith('d-') ||
    class_.startsWith('text-') ||
    class_.startsWith('mdi-') ||
    class_.startsWith('align-') ||
    class_.includes('__') ||
    (file.includes('sd-function-details.vue') && lineNumber === 12) ||
    (file.includes('stoic-panel-visual-designer-bindings.vue') && lineNumber === 30)
  );
}

const vueFiles = {};
async function checkVUEFiles() {
  const files = getFilesFromDirectory(DIRECTORY, '.vue');

  const themeAstCSS = filesContents['./ui/scss/theme.scss'] ? parse(filesContents['./ui/scss/theme.scss']) : null;
  const themeClasses = themeAstCSS ? getCSSClasses(themeAstCSS) : [];
  const stoicAstCSS = filesContents['./ui/scss/stoic.scss'] ? parse(filesContents['./ui/scss/stoic.scss']) : null;
  const stoicClasses = stoicAstCSS ? getCSSClasses(stoicAstCSS) : [];
  const mixinsAstCSS = filesContents['./ui/scss/mixins.scss'] ? parse(filesContents['./ui/scss/mixins.scss']) : null;
  const mixinsClasses = mixinsAstCSS ? getCSSClasses(mixinsAstCSS) : [];
  const globalClasses = themeClasses.concat(stoicClasses).concat(mixinsClasses);

  for (const file of files) {
    const pathArray = file.split('/');
    const componentName = pathArray[pathArray.length - 1].replace('.vue', '');
    vueFiles[componentName] = filesContents[file];
  }

  for (const file of files) {
    const pathArray = file.split('/');
    const componentName = pathArray[pathArray.length - 1].replace('.vue', '');
    const lines = vueFiles[componentName].split('\n');
    const cssFile = pathArray
      .slice(0, pathArray.length - 1)
      .concat(['lib', componentName + '.scss'])
      .join('/');
    const astContent = filesContents[cssFile] || filesContents[cssFile.replace('.scss', '.unscoped.scss')];
    const astCSS = astContent ? parse(astContent) : null;
    const astClasses = astCSS ? getCSSClasses(astCSS) : [];
    const classes = astClasses.concat(globalClasses);
    const linesInfo = [];

    let cummulatedAttributeNames = [];
    let cummulatedEventNames = [];
    let cumulatedAttributesAndEventLinesInfo = [];
    let currentBlockDepth = -1;
    let isInsideAttribute = false;

    for (const [lineIndex, line] of lines.entries()) {
      const lineNumber = lineIndex + 1;

      if (line.includes('this.')) {
        addWarning(file, lineNumber, 'invalid this', 'Remove "this."');
      }

      if (line.includes('mdi-') && !line.includes('mdi-rotate')) {
        addWarning(file, lineNumber, 'missing term', 'Remove hardcoded "mdi-"');
      }

      const previousLineInfo = linesInfo[lineIndex - 1] || {};

      if (previousLineInfo.hasEndingTag && TAG_WITHOUT_CLOSE.has(previousLineInfo.tagName)) {
        currentBlockDepth--;
      }

      const lineInfo = computeHTMLLineInfo(line, lineNumber, currentBlockDepth, previousLineInfo);
      /*
      console.log('=>', line);
      console.log(lineInfo);
      console.log('---------');
      */
      if (lineInfo.attributeValue && lineInfo.attributeValue.includes("'") && lineInfo.attributeValue.includes('+')) {
        const arr = lineInfo.attributeValue.split('+');
        const templateStrArr = arr.map((it) => {
          const exp = it.trim();
          if (exp.startsWith("'")) {
            return exp.replace(/'/g, '');
          } else {
            return '${' + exp + '}';
          }
        });
        addWarning(
          file,
          lineNumber,
          'template string',
          '`' + templateStrArr.join('') + '`',
          `Replace '${lineInfo.attributeValue}' by '\`${templateStrArr.join('')}\`' (template string).`
        );
      }

      if (lineInfo.attributeNames.length === 1) {
        if (
          lineInfo.attributeNames[0] === 'style' &&
          !lineInfo.isVueBinding &&
          !line.includes('break-') &&
          !line.includes('url(')
        ) {
          addWarning(file, lineNumber, 'inline css', 'style should be in a dedicated stylesheet');
        }

        if (lineInfo.attributeNames[0] === 'class') {
          if (lineInfo.line.includes(':class') && lineInfo.line.includes('"{')) {
            if (!lineInfo.line.includes('"{ ') || !lineInfo.line.includes(' }')) {
              addWarning(file, lineNumber, 'add space', `Add 'space' after '{'  and before '}' in dynamic class.`);
            }

            if (lineInfo.line.trim().includes(' : ')) {
              addWarning(file, lineNumber, 'remove space', `Remove 'space' before ':' in dynamic class.`);
            }
          }

          const classList = getClassListFromAttribute(lineInfo.line);
          for (const class_ of classList) {
            if (
              !classes.includes(class_) &&
              !isIgnoredClass(class_, file, lineNumber) &&
              lineNumber !== 4 /* component is identified by a class at this line */
            ) {
              addWarning(file, lineNumber, 'unused class', `Remove class '${class_}'. It is not used.`);
            }
          }
        }
      }

      linesInfo.push(lineInfo);

      checkLineSingleQuotes(file, lineInfo, lineNumber);
      checkLineBackTicks(file, lineInfo, lineNumber);

      if (lineInfo.isClosingTag && !lineInfo.isShortClosingTag) {
        currentBlockDepth = lineInfo.depth - 1;
      } else {
        currentBlockDepth = lineInfo.depth;
      }

      const nextLineInfo =
        lines[lineIndex + 1] && computeHTMLLineInfo(lines[lineIndex + 1], lineNumber + 1, currentBlockDepth, lineInfo);

      if (lineInfo.isAttributeOnlyEnded) {
        isInsideAttribute = false;
      }

      if (
        lineInfo.isEmptyLine &&
        previousLineInfo.hasEndingTag &&
        !previousLineInfo.isClosingTag &&
        !previousLineInfo.hasStartingTag &&
        (nextLineInfo.isClosingTag || nextLineInfo.isEmptyLine) &&
        !nextLineInfo.hasStartingTag
      ) {
        addWarning(file, lineNumber, 'empty line', 'Remove this empty line');
      }

      if (lineInfo.isCommentedLine) {
        //addWarning(file, lineNumber, 'comment', `This line is a comment, consider to remove it`);
        continue;
      }

      if (
        line.includes('"scss"') &&
        line.includes('<style') &&
        !line.includes('unscoped') &&
        !line.includes('scoped')
      ) {
        addWarning(file, lineNumber, 'unscoped CSS', 'CSS is unscoped');
      }

      if (line.endsWith(' ')) {
        addWarning(file, lineNumber, 'trailing spaces', 'Remove trailing spaces');
      }

      if (!lineInfo.isEmptyLine && lineInfo.depth > -1) {
        const expectedIndentation = computeExpectedIndentation(lineInfo, isInsideAttribute);

        if (
          expectedIndentation !== lineInfo.indentationCount &&
          !lineInfo.allowMultipleTags &&
          !file.endsWith('sd-function-details.vue') &&
          !file.endsWith('sd-text-editable.vue')
        ) {
          addWarning(
            file,
            lineNumber,
            'bad indentation',
            `Indentation should be ${expectedIndentation} instead of ${lineInfo.indentationCount}`
          );
          break;
        }
      }

      if (
        !lineInfo.isEmptyLine &&
        !previousLineInfo.allowMultipleTags &&
        !lineInfo.isClosingTag &&
        lineIndex > 0 &&
        previousLineInfo.hasEndingTag
      ) {
        addWarning(file, lineNumber, 'empty line', 'Add an empty line before');
      }

      if (lineInfo.attributeNames.length > 0) {
        for (const attribute of lineInfo.attributeNames) {
          if (lineInfo.hasStartingTag && line.lastIndexOf('  ') > line.indexOf('<')) {
            addWarning(file, lineNumber, 'space', 'Too much spaces');
          }

          if (hasUpperCase(attribute)) {
            addWarning(file, lineNumber, 'case', `'${attribute}' should be kebab case (no upper case)`);
          }

          if (shouldCheckAttribute(attribute, lineInfo.tagName)) {
            checkAttributeInVueFile(file, lineNumber, attribute, lineInfo.tagName);
          }

          if (isValidHtmlTag(lineInfo.tagName) && !isValidHtmlAttribute(attribute)) {
            addWarning(
              file,
              lineNumber,
              'invalid attribute',
              `'${attribute}' is invalid for tag '${lineInfo.tagName}'`
            );
          }
        }
      }

      const eventModifierPos = lineInfo.eventName?.indexOf('.');
      const eventName = eventModifierPos > -1 ? lineInfo.eventName?.substr(0, eventModifierPos) : lineInfo.eventName;
      if (eventName && shouldCheckEvent(eventName, lineInfo.tagName)) {
        checkEventInVueFile(file, lineNumber, eventName, lineInfo.tagName);
      }

      if (
        (lineInfo.eventName || lineInfo.attributeNames.length > 0) &&
        lineInfo.equalPosition > -1 &&
        !line.includes(' = ')
      ) {
        addWarning(file, lineNumber, 'space', `'=' should be surronded by at least one space`);
      }

      if (lineInfo.eventName?.endsWith('ed')) {
        addWarning(file, lineNumber, 'past participle', `"${lineInfo.eventName}" should not end with 'ed'`);
      }

      if (lineInfo.attributeNames.length > 0 && previousLineInfo.eventName && !previousLineInfo.hasEndingTag) {
        addWarning(file, lineIndex, 'sorting', `'${previousLineInfo.eventName}' should be declared after attributes`);
      }

      if (lineInfo.hasMustacheCode) {
        if (!line.includes('{{ ')) {
          addWarning(file, lineNumber, 'space', `Missing space after '{{'`);
        } else if (!line.includes(' }}')) {
          addWarning(file, lineNumber, 'space', `Missing space before '}}'`);
        }
      }

      if (lineInfo.hasStartingTag && !lineInfo.isCommentedLine) {
        const sortingAttrError = getSortingError(lineInfo.attributeNames, lineNumber);
        if (sortingAttrError) {
          addWarning(file, sortingAttrError.lineNumber, 'sorting', sortingAttrError.message);
        }
      } else {
        cummulatedAttributeNames.push(...lineInfo.attributeNames);

        if (lineInfo.attributeNames[0]) {
          cumulatedAttributesAndEventLinesInfo.push(lineInfo);
        }
      }

      if (
        ((cummulatedAttributeNames.length === 1 && cummulatedEventNames.length === 0) ||
          (cummulatedAttributeNames.length === 0 && cummulatedEventNames.length === 1)) &&
        lineInfo.hasEndingTag &&
        !lineInfo.hasStartingTag &&
        previousLineInfo.attributeNames.length === 0
      ) {
        addWarning(file, lineNumber, 'only-one-attribute', 'Attribute should be on the previous line');
      }

      if (lineInfo.eventName) {
        cummulatedEventNames.push(lineInfo.eventName);

        cumulatedAttributesAndEventLinesInfo.push(lineInfo);
      }

      if (lineInfo.hasEndingTag) {
        const relativeLineNumber = lineNumber - cummulatedEventNames.length + 1;
        const sortingAttrError = getSortingError(cummulatedAttributeNames, relativeLineNumber);
        if (sortingAttrError) {
          addWarning(file, sortingAttrError.lineNumber, 'sorting', sortingAttrError.message);
        }

        const sortingEventsError = getSortingError(cummulatedEventNames, lineNumber + 1);
        if (sortingEventsError) {
          addWarning(file, sortingEventsError.lineNumber, 'sorting', sortingEventsError.message);
        }

        cummulatedAttributeNames = [];
        cummulatedEventNames = [];

        const equalErrors = getEqualsErrors(cumulatedAttributesAndEventLinesInfo);
        if (equalErrors) {
          for (const equalError of equalErrors) {
            if (!linesInfo[equalError.lineNumber - 1].allowMultipleTags) {
              addWarning(file, equalError.lineNumber, 'equal', equalError.message);
            }
          }
        }

        cumulatedAttributesAndEventLinesInfo = [];
      }

      if (lineInfo.isAttributeOnlyStarted) {
        isInsideAttribute = true;
      }
    }
  }
}

function computeCharCase(ch) {
  if (!isNaN(ch * 1)) {
    return 'ch is numeric';
  }

  if (ch === ch.toLowerCase()) {
    return 'lower case';
  }

  return 'upper case';
}

const IGNORE_KEYWORDS_CASES = ['preserveAspectRatio', 'viewBox'];

function hasUpperCase(string) {
  if (IGNORE_KEYWORDS_CASES.includes(string)) {
    return false;
  }

  for (const ch of string) {
    if (ch === ':') {
      return false;
    }

    if (computeCharCase(ch) === 'upper case') {
      return true;
    }
  }

  return false;
}

async function checkJSonFiles() {
  const files = getFilesFromDirectory(DIRECTORY, '.spec.json');
  for (const file of files) {
    const data = filesContents[file];
    const json = JSON.parse(data);
    if (json.length === 1 && (!json[0].options || Object.keys(json[0].options).length === 0)) {
      addWarning(file, null, 'empty spec', 'Remove this spec file, it is unused');
    }
  }
}

const VALID_HTML_TAGS = ['a', 'body', 'br', 'div', 'head', 'img', 'li', 'hr', 'p', 'span', 'style', 'u', 'ul'];
function isValidHtmlTag(tag) {
  return VALID_HTML_TAGS.includes(tag);
}

const VALID_HTML_ATTRIBUTES = [
  'alt',
  'class',
  'contenteditable',
  'crossorigin',
  'disabled',
  'href',
  'id',
  'key',
  'lang',
  'ref',
  'slot',
  'src',
  'style',
  'tabindex',
  'target',
  'title',
  'v-click-outside',
  'v-if',
  'v-else',
  'v-else-if',
  'v-for',
  'v-html',
  'v-on',
  'v-show',
];

function isValidHtmlAttribute(attribute) {
  return VALID_HTML_ATTRIBUTES.includes(attribute) || attribute.startsWith('v-can') || attribute.startsWith('data-');
}

function findDuplicates(arr) {
  return arr.filter((item, index) => arr.indexOf(item) != index);
}

function checkAndShortAnd(filePath, line, lineNumber) {
  const index = line.indexOf(' && ');
  if (index === -1) {
    return;
  }

  const before = line.substr(0, index);
  const beforeKeyword = before.substr(before.lastIndexOf(' ') + 1);
  const after = line.substr(index + 4);
  const afterKeyword = after.substr(0, after.indexOf(' '));

  if (afterKeyword.startsWith(`${beforeKeyword}.`)) {
    addWarning(
      filePath,
      lineNumber,
      'shortand',
      `Replace '${beforeKeyword} && ${afterKeyword}' by '${afterKeyword.replace('.', '?.')}'`
    );
  }
}

function checkSwitchCase(filePath, lines) {
  for (const [lineIndex, line] of lines.entries()) {
    if (line.trim().startsWith('case') || line.trim() === 'default:') {
      const previousLine = lines[lineIndex - 1].trim();
      if (
        previousLine &&
        !previousLine.startsWith('switch (') &&
        !previousLine.startsWith('case') &&
        !previousLine.startsWith('//')
      ) {
        addWarning(filePath, lineIndex + 1, 'empty line', 'Add an empty line before');
      }
    }
  }
}

function checkImports(filePath) {
  const locations = importsLines[filePath].map((it) => it.line.split(' from ')[1].replace(/'/g, '').replace(/;/g, ''));

  for (const duplicate of findDuplicates(locations)) {
    addWarning(filePath, null, 'duplicate', `import "${duplicate}" is duplicated`);
  }

  const firstImportSortingError = getImportSortingError(locations, importsLines[filePath]);
  if (firstImportSortingError) {
    addWarning(filePath, firstImportSortingError.lineNumber, 'sorting', `import ${firstImportSortingError.message}`);
  }
}

const IGNORE_ATTRIBUTES = ['class', 'id', 'key', 'ref', 'style', 'tabindex'];
function shouldCheckAttribute(attribute, tagName) {
  return (
    !attribute.startsWith('v-') &&
    !IGNORE_ATTRIBUTES.includes(attribute) &&
    !!tagName &&
    (tagName.startsWith('sd-') || tagName.startsWith('stoic-'))
  );
}

function checkAttributeInVueFile(filePath, lineNumber, prop, tagName) {
  if (!vmcFiles[tagName]) {
    //addWarning(filePath, lineNumber, 'unknown component', `Component '${tagName}' is unknown`);
    return;
  }

  const props = vmcFiles[tagName].props.map((it) => it.name);
  if (!props.includes(prop)) {
    addWarning(filePath, lineNumber, 'unused prop', `Prop '${prop}' should be removed`);
  }
}

const IGNORE_EVENTS = ['click', 'contextMenu', 'dblclick', 'mousedown', 'mouseenter', 'mouseleave'];
function shouldCheckEvent(eventName, tagName) {
  return !IGNORE_EVENTS.includes(eventName) && !!tagName && (tagName.startsWith('sd-') || tagName.startsWith('stoic-'));
}

const IGNORED_EVENTS = [
  'sd-sheet__fetchFile',
  'sd-sheet__openSortDialog',
  'sd-table-base__blurColumnConfigurator',
  'sd-table-base__clickClearSearch',
  'sd-table-base__clickInsertColumn',
  'sd-table-base__clickKeepColumn',
  'sd-table-base__clickLoadJourney',
  'sd-table-base__searchColumn',
  'sd-table-base__updateColumn',
  'sd-table-base__updateColumnConfigurator',
  'sd-table-base__fetchDiscussion',
  'sd-table-base__updateGroupbyAggregation',
  'sd-table-base__vectorizeColumn',
  'sd-viewer-html__fetchFile',
  'stoic-sheet-editor__fetchFile',
];

function checkEventInVueFile(filePath, lineNumber, eventName, tagName) {
  const vmcText =
    vmcFiles[tagName]?._text || console.log('cannot read Vmc file', tagName, eventName, lineNumber, filePath);
  const vueText = vueFiles[tagName] || console.log('cannot read Vue file', tagName, Object.keys(vueFiles));
  const specFile = getFilesFromDirectory(DIRECTORY, tagName + '.spec.json')[0];
  const libFile = getFilesFromDirectory(DIRECTORY, tagName + '.lib.mjs')[0];

  const specText = specFile ? filesContents[specFile] : '';
  const libText = libFile ? filesContents[libFile] : '';

  const _name = `${tagName}__${eventName}`;

  if (
    vueText &&
    !vueText.includes(eventName) &&
    !vmcText.includes(eventName) &&
    !specText.includes(eventName) &&
    !libText.includes(eventName) &&
    !IGNORED_EVENTS.includes(_name)
  ) {
    addWarning(filePath, lineNumber, 'unused event', `Event '${eventName}' should be removed (${_name})`);
  }
}

function getAndCheckImportLines(filePath) {
  const file = filesContents[filePath];
  if (!file) {
    console.error('NOT FOUND', filePath);
  }
  const lines = file.split('\n');
  const importLines = [];
  let emptyLinePosition = null;
  let hasEmptyLineAfterImports = false;
  let isCurrentImportOnMultipleLines = false;
  for (const [lineIndex, line] of lines.entries()) {
    const lineNumber = lineIndex + 1;
    if (line.startsWith('import')) {
      isCurrentImportOnMultipleLines = !line.includes(' from ');
      if (!isCurrentImportOnMultipleLines) {
        importLines.push({ line, lineNumber });
        if (
          !line.endsWith("'util';") &&
          !line.includes('fermat/test/utils') &&
          !line.includes('uiLib/column-charts') &&
          !line.includes('kyu/lib/ui') &&
          !line.includes('@') &&
          line.includes('/') &&
          !line.includes("from 'lib/") &&
          !line.includes('.')
        ) {
          addWarning(filePath, lineNumber, 'missing extension', `Add an extension to import "${line}"`);
        }

        if (line.includes("from 'lib/fermat'") && line.includes('utils')) {
          addWarning(filePath, lineNumber, 'wrong repo', `Fermat's 'utils' should be imported from Principia`);
        }
      }
    } else if (line !== '' && !isCurrentImportOnMultipleLines) {
      if (!hasEmptyLineAfterImports && importLines.length > 0) {
        addWarning(filePath, importLines.length + 1, 'empty line', 'Add an empty line after imports');
      }

      break;
    } else if (!isCurrentImportOnMultipleLines) {
      hasEmptyLineAfterImports = true;
      if (!lines[lineIndex + 1]) {
        addWarning(filePath, null, 'empty file', 'Remove this empty file');
      } else if (lines[lineIndex + 1].startsWith('import')) {
        emptyLinePosition = importLines.length + 1;
      }
    } else if (isCurrentImportOnMultipleLines && line.includes(' from ')) {
      importLines.push({ line, lineNumber });
    }
  }

  if (emptyLinePosition) {
    addWarning(filePath, emptyLinePosition, 'empty line', 'Remove this empty line');
  }

  return importLines;
}

function getImportSortingError(arr, importsLines) {
  let firstErrorIndex = null;
  for (let i = 0; i < arr.length - 1; i++) {
    if (!arr[i].toLowerCase().includes('/') && arr[i + 1].toLowerCase().includes('/')) {
      continue;
    } else if (!arr[i].toLowerCase().startsWith('.') && arr[i + 1].toLowerCase().startsWith('.')) {
      continue;
    } else if (arr[i].toLowerCase().includes('/') && !arr[i + 1].toLowerCase().includes('/')) {
      firstErrorIndex = i;
    } else if (arr[i].toLowerCase().startsWith('.') && !arr[i + 1].toLowerCase().startsWith('.')) {
      firstErrorIndex = i;
    }

    if (firstErrorIndex === null) {
      const ext = getFileExtension(arr[i]);
      const sameExtension = hasSameExtension(arr[i], arr[i + 1]);
      const str1 = sameExtension ? arr[i].replace(`.${ext}`, '').toLowerCase() : arr[i].toLowerCase();
      const str2 = sameExtension ? arr[i + 1].replace(`.${ext}`, '').toLowerCase() : arr[i + 1].toLowerCase();
      if (str1 > str2) {
        firstErrorIndex = i;
      }
    }
  }

  if (firstErrorIndex !== null) {
    return {
      lineNumber: importsLines[firstErrorIndex].lineNumber,
      message: `"${importsLines[firstErrorIndex].line}" should be after "${importsLines[firstErrorIndex + 1].line}"`,
    };
  }

  return null;
}

function hasSameExtension(filename1, filename1) {
  return getFileExtension(filename1) === getFileExtension(filename1);
}

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function computeEqualPosition(line) {
  return line.indexOf('=');
}

function computeExpectedIndentation(lineInfo, isInsideAttribute) {
  const originalIndentation = lineInfo.depth * 2;
  if (
    lineInfo.hasStartingTag ||
    (lineInfo.isClosingTag &&
      !isInsideAttribute &&
      !lineInfo.isShortClosingTag &&
      (!lineInfo.hasEndingTag || lineInfo.tagName !== 'span'))
  ) {
    return originalIndentation;
  }

  return isInsideAttribute ? originalIndentation + 4 : originalIndentation + 2;
}

function computeHTMLLineAttributeNames(line, hasStartingTag, hasEndingTag, equalPosition) {
  if (hasStartingTag && hasEndingTag) {
    const startingTagPosition = line.indexOf('<') || 0;
    line = line.substr(startingTagPosition, line.indexOf('>'));
    equalPosition = equalPosition - startingTagPosition;
  }

  if (hasStartingTag && (!hasEndingTag || equalPosition === -1)) {
    return line
      .trim()
      .replace('>', '')
      .split(' ')
      .filter((it) => it[0] !== '<');
  } else if (equalPosition > -1 && !line.trim().startsWith('@')) {
    const left = line.substr(0, equalPosition).trim().split(' ');
    const attributeName = left[left.length - 1];
    if (attributeName && !attributeName.includes('<')) {
      return [attributeName.startsWith(':') ? attributeName.substr(1) : attributeName];
    }
  }

  return [];
}

function computeHTMLLineAttributeValue(line, hasStartingTag, hasEndingTag, equalPosition, attributeNames) {
  if (hasStartingTag && hasEndingTag) {
    const startingTagPosition = line.indexOf('<') || 0;
    line = line.substr(startingTagPosition, line.indexOf('>'));
    equalPosition = equalPosition - startingTagPosition;
  }

  if (hasStartingTag && (!hasEndingTag || equalPosition === -1)) {
    return line
      .trim()
      .replace('>', '')
      .split(' ')
      .filter((it) => it[0] !== '<');
  } else if (equalPosition > -1 && !line.trim().startsWith('@')) {
    const res = line
      .substr(equalPosition + 1)
      .trim()
      .replace('>', '')
      .replace(/"/g, '');
    return res;
  }
}

function computeHTMLLineEventName(line, equalPosition) {
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith('@')) {
    return line.substr(0, equalPosition).trim().replace('@', '');
  }
}

function computeHTMLLineIndentation(line) {
  let result = 0;
  for (const char of line) {
    if (char !== ' ') {
      return result;
    }

    result++;
  }

  return result;
}

function computeHTMLLineInfo(line, lineNumber, currentBlockDepth, previousLineInfo) {
  const previousTagName = !previousLineInfo.hasEndingTag ? previousLineInfo.tagName : undefined;
  const isEmptyLine = !line;
  const isCommentedLine = isHTMLCommentedLine(line, previousLineInfo) || isJSCommentedLine(line, previousLineInfo);
  const indentationCount = computeHTMLLineIndentation(line);
  const hasStartingTag = hasHTMLLineStartingTag(line, indentationCount);
  const hasEndingTag = hasHTMLLineEndingTag(line);
  const hasBackTick = hasHTMLLineBackTick(line);
  const hasDollar = hasHTMLLineDollar(line);
  const hasMustacheCode = hasHTMLLineMustacheCode(line);
  const hasPipe = hasHTMLLinePipe(line);
  const equalPosition = computeEqualPosition(line);
  const attributeNames = computeHTMLLineAttributeNames(line, hasStartingTag, hasEndingTag, equalPosition);
  const attributeValue = computeHTMLLineAttributeValue(
    line,
    hasStartingTag,
    hasEndingTag,
    equalPosition,
    attributeNames
  );
  const isVueBinding = isHTMLLineVueBinding(line, attributeNames);
  const eventName = computeHTMLLineEventName(line, equalPosition);
  const isClosingTag = isHTLMClosingTag(line);
  const tagName = extractTagName(line, hasStartingTag, previousTagName);
  const allowMultipleTags = isMultipleTagsAllowed(line, hasStartingTag, tagName);
  const depth = computeLineDepth(currentBlockDepth, hasStartingTag, hasEndingTag);
  const isAttributeOnlyStarted = isHTMLAttributeOnlyStarted(line, tagName, isClosingTag, depth);
  const isAttributeOnlyEnded = isHTMLAttributeOnlyEnded(line, tagName, isClosingTag, depth);
  const isShortClosingTag = isHTLMShortClosingTag(line);
  return {
    allowMultipleTags,
    attributeNames,
    attributeValue,
    depth,
    equalPosition,
    eventName,
    hasBackTick,
    hasDollar,
    hasEndingTag,
    hasStartingTag,
    hasMustacheCode,
    hasPipe,
    indentationCount,
    isAttributeOnlyEnded,
    isAttributeOnlyStarted,
    isClosingTag,
    isCommentedLine,
    isEmptyLine,
    isShortClosingTag,
    isVueBinding,
    line,
    lineNumber,
    tagName,
  };
}

function computeLineDepth(currentBlockDepth, hasStartingTag) {
  return hasStartingTag ? currentBlockDepth + 1 : currentBlockDepth;
}

function countInfoOrWarningsEntries(infoOrWarnings) {
  let count = 0;
  for (const entries of Object.values(infoOrWarnings)) {
    count += entries.length;
  }
  return count;
}

function execute(command) {
  return new Promise(function (resolve, reject) {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout.trim());
    });
  });
}

function extractTagName(line, hasStartingTag, previousTagName) {
  if (!hasStartingTag) {
    return previousTagName;
  }

  const startTagPos = line.indexOf('<');
  const trimmedLine = line.substr(startTagPos + 1);
  const spacePos = trimmedLine.includes(' ') ? trimmedLine.indexOf(' ') : trimmedLine.length;
  const endTagPos = trimmedLine.includes('>') ? trimmedLine.indexOf('>') : trimmedLine.length;
  const shortEndTagPos = trimmedLine.includes('/>') ? trimmedLine.indexOf('/>') : trimmedLine.length;

  const endNameTagPos = Math.min(spacePos, endTagPos, shortEndTagPos);

  return trimmedLine.substr(0, endNameTagPos).replace('/', '');
}

function getEqualsErrors(cumulatedAttributesAndEventLinesInfo) {
  if (cumulatedAttributesAndEventLinesInfo.length === 0) {
    return;
  }

  // Compute max Length
  let maxLength = 0;
  for (const lineInfo of cumulatedAttributesAndEventLinesInfo) {
    const name = lineInfo.eventName || lineInfo.attributeNames[0];
    const nameLength = name.length + (lineInfo.eventName || lineInfo.isVueBinding ? 1 : 0);
    if (nameLength > maxLength) {
      maxLength = nameLength;
    }
  }
  const expectedEqualPosition = cumulatedAttributesAndEventLinesInfo[0].indentationCount + 1 + maxLength;

  const errors = [];
  for (const lineInfo of cumulatedAttributesAndEventLinesInfo) {
    if (lineInfo.equalPosition !== expectedEqualPosition) {
      errors.push({ lineNumber: lineInfo.lineNumber, message: `Equal is not correctly aligned` });
    }
  }

  return errors;
}

function getFilesFromDirectory(directory, filter) {
  const files = [];
  const items = fs.readdirSync(directory);
  for (const item of items) {
    const itemPath = directory + '/' + item;
    const stat = fs.statSync(itemPath);

    if (stat.isFile()) {
      if (isMatchingFilter(itemPath, filter)) {
        files.push(itemPath);
      }
    } else if (stat.isDirectory()) {
      const subfiles = getFilesFromDirectory(itemPath).filter((it) => isMatchingFilter(it, filter));
      files.push(...subfiles);
    }
  }

  return files;
}

function getSortingError(arr, lineNumber = null) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].toLowerCase().startsWith('v-if')) {
      continue;
    } else if (arr[i].toLowerCase().startsWith('v-') && !arr[i + 1].toLowerCase().startsWith('v-')) {
      continue;
    }

    if (arr[i].toLowerCase() > arr[i + 1].toLowerCase()) {
      const message = `"${arr[i]}" should be after "${arr[i + 1]}"`;
      return lineNumber ? { lineNumber: lineNumber - arr.length + i, message } : message;
    }
  }

  return null;
}

function hasHTMLLineBackTick(line) {
  return line.includes('`');
}

function hasHTMLLineDollar(line) {
  return line.includes('$');
}

function hasHTMLLineEndingTag(line) {
  const lastIndexArg = line.lastIndexOf('"');
  const endOfLine = lastIndexArg > -1 ? line.substr(lastIndexArg) : line;
  return endOfLine.includes('>') && endOfLine.substr(line.length - 2) !== '->';
}

function hasHTMLLineMustacheCode(line) {
  return line.includes('{{');
}

function hasHTMLLinePipe(line) {
  return line.includes('|');
}

function hasHTMLLineStartingTag(line, indentationCount) {
  return !!line.match(/<[a-z]/i);
}

function isHTMLAttributeOnlyEnded(line) {
  return line.endsWith('}"');
}

function isHTMLAttributeOnlyStarted(line, tagName, isClosingTag, depth) {
  return line.endsWith('= "{');
}

function isHTLMClosingTag(line) {
  return !!line.match(/<\/[a-z]/i) || isHTLMShortClosingTag(line);
}

function isHTMLCommentedLine(line, previousLineInfo) {
  if (line.trim().startsWith('<!--') || line.includes('-->')) {
    return true;
  } else if (previousLineInfo.line?.includes('-->')) {
    return false;
  } else {
    return !!previousLineInfo.isCommentedLine;
  }
}

function isJSCommentedLine(line, previousLineInfo) {
  if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.includes('*/')) {
    return true;
  } else if (previousLineInfo.line?.includes('*/') || previousLineInfo.line?.trim()?.startsWith('//')) {
    return false;
  } else {
    return !!previousLineInfo.isCommentedLine;
  }
}

function isHTMLLineVueBinding(line, attributeNames) {
  return attributeNames.length === 1 && line.includes(':' + attributeNames[0]);
}

function isHTLMShortClosingTag(line) {
  return line.includes('/>');
}

function isMatchingFilter(fileName, filter) {
  return !filter || fileName.endsWith(filter);
}

function isMultipleTagsAllowed(line, hasStartingTag, tagName) {
  if (tagName !== 'span' || !hasStartingTag) {
    return false;
  }

  return line.match(/span/g).length > 1;
}

function log(message, type) {
  console.log(COLOR_FROM_TYPE[type] || DEFAULT_COLOR, message);
}

function printInfoAndWarningsResume(infoOrWarnings, type) {
  const countFilesWithInfoOrWarnings = Object.keys(infoOrWarnings).length;
  if (countFilesWithInfoOrWarnings > 0) {
    log(`  ❌ ${countFilesWithInfoOrWarnings} file(s) with ${type}s found`, 'warning');
  } else {
    log('  ✅ All good', 'ok');
  }
}

function printInfoAndWarnings(infoOrWarnings, type) {
  const countFilesWithInfoOrWarnings = Object.keys(infoOrWarnings).length;
  const countInfoOrWarnings = countInfoOrWarningsEntries(infoOrWarnings);

  if (countFilesWithInfoOrWarnings > 0) {
    log('/**************************************************************************', 'comment');
    log(` *        ${countInfoOrWarnings} ${type}s in ${countFilesWithInfoOrWarnings} files`, 'comment');
    log(' **************************************************************************/', 'comment');
  }

  for (const file of Object.keys(infoOrWarnings)) {
    const fileName = file.replace(/^.*[\\\/]/, '');
    log('\n' + fileName, 'info');
    const link = infoOrWarnings[file][0]?.lineNumber ? `${file}:${infoOrWarnings[file][0].lineNumber}` : file;
    log(link, 'path');
    for (const infoOrWarning of infoOrWarnings[file]) {
      const lineMsg = infoOrWarning.lineNumber ? `[line ${infoOrWarning.lineNumber}] ` : '';
      log(`\t${lineMsg}(${infoOrWarning.type}) ${infoOrWarning.message}`, 'warning');
    }
  }
}

function processSequence(filePath, type) {
  let isFileUpdated = false;
  const sequences = readJSONFile(filePath);
  for (const sequence of sequences) {
    const isSequenceSorted = sortParams(sequence.steps);
    if (isSequenceSorted) {
      isFileUpdated = true;
    }
  }

  if (isFileUpdated) {
    const data = JSON.stringify(sequences, null, 2);
    fs.writeFileSync(filePath, data);
  }

  return isFileUpdated;
}

function processTest(filePath, type) {
  let isFileUpdated = false;
  const test = readJSONFile(filePath);
  for (const sequence of test.sequences || []) {
    const isTestSorted = sortParams(sequence.steps);
    if (isTestSorted) {
      isFileUpdated = true;
    }
  }

  const isTestSorted = sortParams(test.steps);
  if (isTestSorted) {
    isFileUpdated = true;
  }

  if (isFileUpdated) {
    const data = JSON.stringify(test, null, 2);
    fs.writeFileSync(filePath, data);
  }

  return isFileUpdated;
}

function readJSONFile(filePath) {
  return JSON.parse(filesContents[filePath]);
}

function sortParams(steps) {
  if (!steps) {
    return;
  }

  let isUpdated = false;
  for (const step of steps) {
    if (step.params && !Array.isArray(step.params)) {
      const sorted = sortObject(step.params);
      if (JSON.stringify(step.params) !== JSON.stringify(sorted)) {
        step.params = sorted;
        isUpdated = true;
      }
    }

    if (step.repeatWith) {
      for (const [i, instance] of Object.entries(step.repeatWith)) {
        const sorted = sortObject(instance);
        if (JSON.stringify(instance) !== JSON.stringify(sorted)) {
          step.repeatWith[i] = sortObject(instance);
          isUpdated = true;
        }
      }
    }
  }

  return isUpdated;
}

function sortObject(object) {
  return Object.keys(object)
    .sort()
    .reduce((obj, key) => {
      obj[key] = object[key];
      return obj;
    }, {});
}

async function go() {
  log('Read files content...', 'comment');
  await readAndIndexFiles();

  printInfoAndWarningsResume(info, 'info');

  log('Check code files...', 'comment');
  await checker();
  printInfoAndWarningsResume(warnings, 'warning');

  printInfoAndWarnings(info, 'info');
  printInfoAndWarnings(warnings, 'warning');
}

go();
