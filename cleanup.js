const Vuedoc = require('@vuedoc/parser');

const DIRECTORY = './src';
const fs = require('fs');
const DEFAULT_COLOR = '\x1b[0m';
const COLOR_FROM_TYPE = {
  comment: '\x1b[36m%s\x1b[0m',
  error: '\x1b[31m%s\x1b[0m',
  info: '\x1b[1m%s\x1b[0m',
  ok: '\x1b[32m%s\x1b[0m',
  warning: '\x1b[33m%s\x1b[0m',
};

const warnings = {};

function addWarning(file, message) {
  warnings[file] = warnings[file] || [];
  warnings[file].push(message);
}

function isMatchingFilter(fileName, filter) {
  return !filter || fileName.includes(filter);
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

async function checkVMCFiles() {
  const files = getFilesFromDirectory(DIRECTORY, '.vmc.js');

  for (const file of files) {
    try {
      const results = await Vuedoc.parse({ filename: file });
      const properties = ['props', 'data', 'computed', 'methods'];
      for (const property of properties) {
        const names = results[property].map((it) => it.name.replace(/-/g, ''));
        const sortingErrors = getSortingError(names);
        if (sortingErrors) {
          addWarning(file, `[${property}]: ${sortingErrors}`);
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
    for (const [lineIndex, line] of lines.entries()) {
      const lineNumber = lineIndex + 1;
      const lineInfo = computeHTMLLineInfo(line);
      const previousLineInfo = linesInfo[lineIndex - 1] || {};
      linesInfo.push(lineInfo);

      // console.log('line ' + lineNumber, '"' + line + '"');
      // console.log('info', lineInfo);
      // console.log('-------');

      if (lineInfo.isCommentedLine) {
        addWarning(file, `[line ${lineNumber}] This line is a comment, consider to remove it`);
        continue;
      }

      if (!lineInfo.isEmptyLine && !lineInfo.isClosingTag && lineIndex > 0 && previousLineInfo.hasEndingTag) {
        addWarning(file, `[line ${lineNumber}] Add an empty line before`);
      }

      if (
        (lineInfo.eventName || lineInfo.attributeNames.length > 0) &&
        lineInfo.equalPosition > -1 &&
        !line.includes(' = ')
      ) {
        addWarning(file, `[line ${lineNumber}] '=' should be surronded by at least one space`);
      }

      if (lineInfo.hasBackTick && !lineInfo.hasDollar) {
        addWarning(file, `[line ${lineNumber}] BackTick should be removed, there is no variable inside`);
      }

      if (lineInfo.hasBackTick && !lineInfo.isVueBinding && !lineInfo.hasMustacheCode) {
        addWarning(file, `[line ${lineNumber}] BackTick should be removed, this is not a vue binding`);
      }

      if (lineInfo.attributeNames.length > 0 && previousLineInfo.eventName && !previousLineInfo.hasEndingTag) {
        addWarning(file, `[line ${lineIndex}] '${previousLineInfo.eventName}' should be declared after attributes`);
      }

      if (lineInfo.hasMustacheCode) {
        if (!line.includes('{{ ')) {
          addWarning(file, `[line ${lineNumber}] Missing space after '{{'`);
        } else if (!line.includes(' }}')) {
          addWarning(file, `[line ${lineNumber}] Missing space before '}}'`);
        }
      }

      if (lineInfo.hasStartingTag && !lineInfo.isCommentedLine) {
        const sortingAttrError = getSortingError(lineInfo.attributeNames, lineNumber);
        if (sortingAttrError) {
          addWarning(file, sortingAttrError);
        }
      } else {
        cummulatedAttributeNames.push(...lineInfo.attributeNames);
      }

      if (lineInfo.eventName) {
        cummulatedEventNames.push(lineInfo.eventName);
      }
      if (lineInfo.hasEndingTag) {
        const relativeLineNumber = lineNumber - cummulatedEventNames.length + 1;
        const sortingAttrError = getSortingError(cummulatedAttributeNames, relativeLineNumber);
        if (sortingAttrError) {
          addWarning(file, sortingAttrError);
        }

        const sortingEventsError = getSortingError(cummulatedEventNames, lineNumber + 1);
        if (sortingEventsError) {
          addWarning(file, sortingEventsError);
        }

        cummulatedAttributeNames = [];
        cummulatedEventNames = [];
      }
    }
  }
}

function computeHTMLLineInfo(line) {
  const isEmptyLine = !line;
  const isCommentedLine = line.trim().startsWith('<!--');
  const indentationCount = computeHTMLLineIndentation(line);
  const hasStartingTag = hasHTMLLineStartingTag(line, indentationCount);
  const hasEndingTag = hasHTMLLineEndingTag(line);
  const hasBackTick = hasHTMLLineBackTick(line);
  const hasDollar = hasHTMLLineDollar(line);
  const hasMustacheCode = hasHTMLLineMustacheCode(line);
  const equalPosition = computeEqualPosition(line);
  const attributeNames = computeHTMLLineAttributeNames(line, hasStartingTag, hasEndingTag, equalPosition);
  const isVueBinding = isHTMLLineVueBinding(line, attributeNames);
  const eventName = computeHTMLLineEventName(line, equalPosition);
  const isClosingTag = isHTLMClosingTag(line);

  return {
    attributeNames,
    equalPosition,
    eventName,
    hasDollar,
    hasEndingTag,
    hasStartingTag,
    hasBackTick,
    hasMustacheCode,
    indentationCount,
    isClosingTag,
    isCommentedLine,
    isEmptyLine,
    isVueBinding,
  };
}

function computeEqualPosition(line) {
  return line.indexOf('=');
}

function computeHTMLLineAttributeNames(line, hasStartingTag, hasEndingTag, equalPosition) {
  if (hasStartingTag && hasEndingTag) {
    line = line.substr(0, line.indexOf('>'));
  }

  if (hasStartingTag && (!hasEndingTag || equalPosition === -1)) {
    return line
      .trim()
      .replace('>', '')
      .split(' ')
      .filter((it) => it[0] !== '<');
  } else if (equalPosition > -1 && !line.trim().startsWith('@')) {
    const left = line.substr(0, equalPosition).trim().split(' ');
    const attributeName = left[left.length - 1].replace(':', '');
    if (attributeName) {
      return [attributeName];
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

function hasHTMLLineBackTick(line) {
  return line.includes('`');
}

function hasHTMLLineDollar(line) {
  return line.includes('$');
}

function hasHTMLLineStartingTag(line, indentationCount) {
  return line.substr(indentationCount, 1) === '<' && line.substr(indentationCount, 2) !== '<!';
}

function hasHTMLLineEndingTag(line) {
  return line.substr(line.length - 1) === '>' && line.substr(line.length - 2) !== '->';
}

function hasHTMLLineMustacheCode(line) {
  return line.includes('{{');
}

function isHTLMClosingTag(line) {
  return line.trim().startsWith('</');
}

function isHTMLLineVueBinding(line, attributeNames) {
  return attributeNames.length === 1 && line.includes(':' + attributeNames[0]);
}

function getSortingError(arr, lineNumber = null) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].toLowerCase().startsWith('v-') && !arr[i + 1].toLowerCase().startsWith('v-')) {
      continue;
    }

    if (arr[i].toLowerCase() > arr[i + 1].toLowerCase()) {
      const message = `"${arr[i]}" should be after "${arr[i + 1]}"`;
      return lineNumber ? `[line ${lineNumber - arr.length + i}] ${message}` : message;
    }
  }

  return null;
}

function log(message, type) {
  console.log(COLOR_FROM_TYPE[type] || DEFAULT_COLOR, message);
}

function printWarnings() {
  const count = Object.keys(warnings).length;
  if (count > 0) {
    log('/**************************************************************************', 'comment');
    log(` *                           ${count}  files with  warnings;                    *`, 'comment');
    log(' **************************************************************************/', 'comment');
  } else {
    log('Yeah!, All good', 'ok');
  }

  for (const file of Object.keys(warnings)) {
    const fileName = file.replace(/^.*[\\\/]/, '');
    log('\n' + fileName, 'info');
    log(file, 'path');
    for (const message of warnings[file]) {
      log('\t' + message, 'warning');
    }
  }
}

async function checker() {
  //await checkVMCFiles();
  await checkVUEFiles();
  printWarnings();
}

checker();
