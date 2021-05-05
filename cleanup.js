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
        const sortingErrors = getSortingErrors(names);
        if (sortingErrors) {
          addWarning(file, `[${property}]: ${sortingErrors}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

function getSortingErrors(arr) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].toLowerCase() > arr[i + 1].toLowerCase()) {
      return `"${arr[i]}" should be after "${arr[i + 1]}"`;
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
  await checkVMCFiles();
  printWarnings();
}

checker();
