/*
TODOS:

- Detect when there is only one attribute on a separate line
  <div
    class = "foo">

- Detect when there is no empty line before when a line starts with `case XXX:` or `default`
- Detect when events (@...) ends with 'ed'
*/

const fs = require('fs');
const Vuedoc = require('@vuedoc/parser');
const { exec } = require('child_process');
const { parse, stringify } = require('scss-parser');

const DIRECTORY = './src';
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
      const data = fs.readFileSync(file, { encoding: 'utf8', flag: 'r' });
      const ast = parse(data);
      const blocks = getSCSSBlocks(ast);
      const sortingErrors = findCSSBlockError(blocks);
      if (sortingErrors) {
        for (sortingError of sortingErrors) {
          addWarning(file, sortingError.lineNumber, 'sorting', sortingError.message);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

async function checkJSFiles() {
  //const filePaths = getFilesFromDirectory(DIRECTORY, 'code-range.vmc.js');
  const filePaths = getFilesFromDirectory(DIRECTORY, '.js').concat(getFilesFromDirectory('./test', '.js'));
  for (const filePath of filePaths) {
    checkImports(filePath);
  }
}

async function checkVMCFiles() {
  const files = getFilesFromDirectory(DIRECTORY, '.vmc.js');

  for (const file of files) {
    try {
      const results = await Vuedoc.parse({ filename: file });
      const properties = ['props', 'data', 'computed', 'methods'];
      const data = fs.readFileSync(file, { encoding: 'utf8', flag: 'r' });
      const isFileWithSection = data.includes(SECTION_SEPARATOR);

      for (const property of properties) {
        if (property === 'methods' && isFileWithSection) {
          continue;
        }

        const names = results[property].map((it) => it.name.replace(/-/g, ''));
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

async function checkVUEFiles() {
  const files = getFilesFromDirectory(DIRECTORY, '.vue');
  for (const file of files) {
    const data = fs.readFileSync(file, { encoding: 'utf8', flag: 'r' });
    const lines = data.split('\n');
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

      const previousLineInfo = linesInfo[lineIndex - 1] || {};

      if (previousLineInfo.hasEndingTag && TAG_WITHOUT_CLOSE.has(previousLineInfo.tagName)) {
        currentBlockDepth--;
      }

      const lineInfo = computeHTMLLineInfo(line, lineNumber, currentBlockDepth, previousLineInfo);
      linesInfo.push(lineInfo);

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

      // console.log('line ' + lineNumber, '"' + line + '"');
      // console.log('info', lineInfo);
      // console.log('-------');
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

      if (!lineInfo.isEmptyLine && lineInfo.depth > -1) {
        const expectedIndentation = computeExpectedIndentation(lineInfo, isInsideAttribute);

        if (
          expectedIndentation !== lineInfo.indentationCount &&
          !lineInfo.allowMultipleTags &&
          !file.endsWith('sd-function-details.vue')
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
          if (hasUpperCase(attribute)) {
            addWarning(file, lineNumber, 'case', `'${attribute}' should be kebab case (no upper case)`);
          }
        }
      }

      if (
        (lineInfo.eventName || lineInfo.attributeNames.length > 0) &&
        lineInfo.equalPosition > -1 &&
        !line.includes(' = ')
      ) {
        addWarning(file, lineNumber, 'space', `'=' should be surronded by at least one space`);
      }

      if (lineInfo.hasBackTick && !lineInfo.hasDollar && !lineInfo.hasPipe) {
        addWarning(file, lineNumber, 'BackTick', `BackTick should be removed, there is no variable inside`);
      }

      if (lineInfo.hasBackTick && !lineInfo.isVueBinding && !lineInfo.hasMustacheCode) {
        addWarning(file, lineNumber, 'BackTick', `BackTick should be removed, this is not a vue binding`);
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
    const data = fs.readFileSync(file, { encoding: 'utf8', flag: 'r' });
    const json = JSON.parse(data);
    if (json.length === 1 && !json[0].options) {
      addWarning(file, null, 'empty spec', 'Remove this spec file, it is unused');
    }
  }
}

async function cleanTestFiles() {
  const fileSequencesPaths = getFilesFromDirectory(DIRECTORY, '.sequences.json');
  const fileTestsPaths = getFilesFromDirectory(DIRECTORY, '.test.json');

  let hasAtLeastOneUpdate = false;
  for (const fileSequencesPath of fileSequencesPaths) {
    const isFileUpdated = processSequence(fileSequencesPath);
    if (isFileUpdated) {
      hasAtLeastOneUpdate = true;
      addInfo(fileSequencesPath, null, 'stepParamsSorting', 'this file has been sorted automatically');
    }
  }

  for (const fileTestsPath of fileTestsPaths) {
    const isFileUpdated = processTest(fileTestsPath);
    if (isFileUpdated) {
      hasAtLeastOneUpdate = true;
      addInfo(fileTestsPath, null, 'stepParamsSorting', 'this file has been sorted automatically');
    }
  }

  if (hasAtLeastOneUpdate) {
    try {
      await execute("prettier '**/*.{test.json,sequences.json}' --write");
    } catch (e) {
      console.error(e.message);
    }
  }
}

function findDuplicates(arr) {
  return arr.filter((item, index) => arr.indexOf(item) != index);
}

function checkImports(filePath) {
  const importsLines = getAndCheckImportLines(filePath);
  const locations = importsLines.map((it) => it.line.split(' from ')[1].replace(/'/g, '').replace(/;/g, ''));

  for (const duplicate of findDuplicates(locations)) {
    addWarning(filePath, null, 'duplicate', `import "${duplicate}" is duplicated`);
  }

  const firstImportSortingError = getImportSortingError(locations, importsLines);
  if (firstImportSortingError) {
    addWarning(filePath, firstImportSortingError.lineNumber, 'sorting', `import ${firstImportSortingError.message}`);
  }
}

function getAndCheckImportLines(filePath) {
  const file = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
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
          !line.includes('lib/column-charts') &&
          !line.includes('kyu/lib/ui') &&
          !line.includes('@') &&
          line.includes('/') &&
          !line.includes('.')
        ) {
          addWarning(filePath, lineNumber, 'missing extension', `Add an extension to import "${line}"`);
        }

        if (line.includes("from 'fermat'") && line.includes('utils')) {
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
    if (attributeName) {
      return [attributeName.startsWith(':') ? attributeName.substr(1) : attributeName];
    }
  }

  return [];
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
  const isCommentedLine = isHTMLCommentedLine(line, previousLineInfo);
  const indentationCount = computeHTMLLineIndentation(line);
  const hasStartingTag = hasHTMLLineStartingTag(line, indentationCount);
  const hasEndingTag = hasHTMLLineEndingTag(line);
  const hasBackTick = hasHTMLLineBackTick(line);
  const hasDollar = hasHTMLLineDollar(line);
  const hasMustacheCode = hasHTMLLineMustacheCode(line);
  const hasPipe = hasHTMLLinePipe(line);
  const equalPosition = computeEqualPosition(line);
  const attributeNames = computeHTMLLineAttributeNames(line, hasStartingTag, hasEndingTag, equalPosition);
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
    log(file, 'path');
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
  return JSON.parse(fs.readFileSync(filePath));
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
  log('Cleaning test files...', 'comment');
  await cleanTestFiles();
  printInfoAndWarningsResume(info, 'info');

  log('Check code files...', 'comment');
  await checker();
  printInfoAndWarningsResume(warnings, 'warning');

  printInfoAndWarnings(info, 'info');
  printInfoAndWarnings(warnings, 'warning');
}

go();
