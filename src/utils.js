import fs from 'fs';
import { log } from './printReport.js';

const VALID_HTML_TAGS = new Set(['a', 'body', 'br', 'div', 'head', 'img', 'li', 'hr', 'p', 'span', 'style', 'u', 'ul']);

const VALID_HTML_ATTRIBUTES = new Set([
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
  'v-bind',
  'v-click-outside',
  'v-if',
  'v-else',
  'v-else-if',
  'v-for',
  'v-html',
  'v-on',
  'v-show',
]);

export function camelize(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, function (match, chr) {
    return chr.toUpperCase();
  });
}

export function computeVuePathFromVmcOrScssPath(vmcFilePath, hideLog = false) {
  const splitPath = vmcFilePath.split('/');

  const vueFileName = splitPath.at(-1).replace('.vmc.ts', '.vue').replace('.vmc.js', '.vue').replace('.scss', '.vue');
  const dirPath = splitPath.splice(0, splitPath.length - 2).join('/') + '/';
  const vueFilePath = dirPath + vueFileName;

  if (!fs.existsSync(vueFilePath)) {
    if (!hideLog) {
      log(`Vue file not found: ${vueFilePath}`, 'error');
    }

    return null;
  }

  return vueFilePath;
}

export function findDuplicates(arr) {
  return arr.filter((item, index) => arr.indexOf(item) != index);
}

export function getSortingError(arr, lineNumber = null) {
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

export function isValidHtmlAttribute(attribute) {
  return VALID_HTML_ATTRIBUTES.has(attribute);
}

export function isValidHtmlTag(tag) {
  return VALID_HTML_TAGS.has(tag);
}
