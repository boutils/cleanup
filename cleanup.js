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

function addWarning(file, lineNumber, type, message) {
  warnings[file] = warnings[file] || [];
  warnings[file].push({ lineNumber, type, message });
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
    for (const [lineIndex, line] of lines.entries()) {
      const lineNumber = lineIndex + 1;
      const lineInfo = computeHTMLLineInfo(line, lineNumber, currentBlockDepth);
      const previousLineInfo = linesInfo[lineIndex - 1] || {};
      linesInfo.push(lineInfo);

      currentBlockDepth = lineInfo.isClosingTag ? lineInfo.depth - 1 : lineInfo.depth;

      // console.log('line ' + lineNumber, '"' + line + '"');
      // console.log('info', lineInfo);
      // console.log('-------');

      if (lineInfo.isCommentedLine) {
        //addWarning(file, lineNumber, 'comment', `This line is a comment, consider to remove it`);
        continue;
      }

      if (!lineInfo.isEmptyLine && lineInfo.depth > -1) {
        const expectedIndentation =
          lineInfo.hasStartingTag || lineInfo.isClosingTag ? lineInfo.depth * 2 : lineInfo.depth * 2 + 2;
        if (expectedIndentation !== lineInfo.indentationCount) {
          addWarning(
            file,
            lineNumber,
            'bad indentation',
            `Indentation should be ${expectedIndentation} instead of ${lineInfo.indentationCount}`
          );
        }
      }

      if (
        !lineInfo.isEmptyLine &&
        !previousLineInfo.allowMultipleTags &&
        !lineInfo.isClosingTag &&
        lineIndex > 0 &&
        previousLineInfo.hasEndingTag
      ) {
        addWarning(file, lineNumber, 'empty line', `Add an empty line before`);
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
    }
  }
}

function computeHTMLLineInfo(line, lineNumber, currentBlockDepth) {
  const isEmptyLine = !line;
  const isCommentedLine = line.trim().startsWith('<!--');
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
  const tagName = extractTagName(line, hasStartingTag);
  const allowMultipleTags = isMultipleTagsAllowed(line, tagName);
  const depth = computeLineDepth(currentBlockDepth, hasStartingTag, hasEndingTag);

  return {
    allowMultipleTags,
    attributeNames,
    depth,
    equalPosition,
    eventName,
    hasDollar,
    hasEndingTag,
    hasStartingTag,
    hasBackTick,
    hasMustacheCode,
    hasPipe,
    indentationCount,
    isClosingTag,
    isCommentedLine,
    isEmptyLine,
    isVueBinding,
    lineNumber,
    tagName,
  };
}

function computeEqualPosition(line) {
  return line.indexOf('=');
}

function computeLineDepth(currentBlockDepth, hasStartingTag) {
  return hasStartingTag ? currentBlockDepth + 1 : currentBlockDepth;
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

function extractTagName(line, hasStartingTag) {
  if (!hasStartingTag) {
    return;
  }

  const startTagPos = line.indexOf('<');
  const trimmedLine = line.substr(startTagPos + 1);
  const spacePos = trimmedLine.includes(' ') ? trimmedLine.indexOf(' ') : trimmedLine.length;
  const endTagPos = trimmedLine.includes('>') ? trimmedLine.indexOf('>') : trimmedLine.length;

  const endNameTagPos = Math.min(spacePos, endTagPos);

  return trimmedLine.substr(0, endNameTagPos);
}

function hasHTMLLineBackTick(line) {
  return line.includes('`');
}

function hasHTMLLinePipe(line) {
  return line.includes('|');
}

function hasHTMLLineDollar(line) {
  return line.includes('$');
}

function hasHTMLLineStartingTag(line, indentationCount) {
  return !!line.match(/<[a-z]/i);
}

function hasHTMLLineEndingTag(line) {
  const lastIndexArg = line.lastIndexOf('"');
  const endOfLine = lastIndexArg > -1 ? line.substr(lastIndexArg) : line;
  return endOfLine.includes('>') && endOfLine.substr(line.length - 2) !== '->';
}

function hasHTMLLineMustacheCode(line) {
  return line.includes('{{');
}

function isHTLMClosingTag(line) {
  return !!line.match(/<\/[a-z]/i);
}

function isHTMLLineVueBinding(line, attributeNames) {
  return attributeNames.length === 1 && line.includes(':' + attributeNames[0]);
}

function isMultipleTagsAllowed(line, tagName) {
  if (tagName !== 'span') {
    return false;
  }

  return line.match(/span/g).length > 1;
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

function log(message, type) {
  console.log(COLOR_FROM_TYPE[type] || DEFAULT_COLOR, message);
}

function countWarningsEntries(warnings) {
  let count = 0;
  for (const entries of Object.values(warnings)) {
    count += entries.length;
  }
  return count;
}

function printWarnings() {
  const countFilesWithWarnings = Object.keys(warnings).length;
  const countWarnings = countWarningsEntries(warnings);

  if (countFilesWithWarnings > 0) {
    log('/**************************************************************************', 'comment');
    log(` *        ${countWarnings} warnings in ${countFilesWithWarnings} files`, 'comment');
    log(' **************************************************************************/', 'comment');
  } else {
    log('Yeah!, All good', 'ok');
  }

  for (const file of Object.keys(warnings)) {
    const fileName = file.replace(/^.*[\\\/]/, '');
    log('\n' + fileName, 'info');
    log(file, 'path');
    for (const warning of warnings[file]) {
      const lineMsg = warning.lineNumber ? `[line ${warning.lineNumber}] ` : '';
      log(`\t${lineMsg}(${warning.type}) ${warning.message}`, 'warning');
    }
  }
}

async function checker() {
  await checkVMCFiles();
  await checkVUEFiles();
  printWarnings();
}

checker();
