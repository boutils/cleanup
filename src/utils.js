import fs from 'fs';
import { log } from './printReport.js';

export const VMC_SECTIONS = [
  { name: 'data', suffix: '():', emptySuffix: '():,' },
  { name: 'components', suffix: ': {', emptySuffix: ': {},' },
  { name: 'computed', suffix: ': {', emptySuffix: ': {},' },
  { name: 'created', suffix: ': {', emptySuffix: '() {},' },
  { name: 'emits', suffix: ': [', emptySuffix: ': [],' },
  { name: 'mixins', suffix: ': [', emptySuffix: ': [],' },
  { name: 'mounted', suffix: '() {', emptySuffix: '() {},' },
  { name: 'methods', suffix: '', emptySuffix: ': {},' },
  { name: 'name', suffix: ": '", emptySuffix: ": ''," },
  { name: 'props', suffix: ': {', emptySuffix: ': {},' },
  { name: 'unmounted', suffix: '() {', emptySuffix: '() {},' },
  { name: 'watch', suffix: ': {', emptySuffix: ': {},' },
];

const IGNORED_CLASSES = [
  'active',
  'cursor-pointer',
  'disabled',
  'fill-height',
  'flex-column',
  'headline',
  'title',
  'caption',
  'overline',
  'syntax',
  'table',
  'theme--dark',
];

const VALID_HTML_TAGS = new Set(['a', 'body', 'br', 'div', 'head', 'img', 'li', 'hr', 'p', 'span', 'style', 'u', 'ul']);

const VALID_HTML_ATTRIBUTES = new Set([
  'alt',
  'autocomplete',
  'class',
  'contenteditable',
  'crossorigin',
  'disabled',
  'href',
  'id',
  'key',
  'lang',
  'no-spellcheck',
  'ref',
  'slot',
  'src',
  'spellcheck',
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

export function computeCSSPathFromVuePath(vueFilePath, hideLog = false) {
  const splitPath = vueFilePath.split('/');

  const scssFileName = splitPath.at(-1).replace('.vue', '.scss');
  const dirPath = splitPath.splice(0, splitPath.length - 1).join('/') + '/lib/';
  const scssFilePath = dirPath + scssFileName;

  if (!fs.existsSync(scssFilePath)) {
    if (!hideLog) {
      log(`SCSS file not found: ${scssFilePath}`, 'error');
    }

    return null;
  }

  return scssFilePath;
}

export function computeRelatedLibPath(fromFilePath, hideLog = false) {
  const splitPath = fromFilePath.split('/');

  const libFileName = splitPath.at(-1).replace('.scss', '.vmc.ts').replace('.i18n.json', '.lib.ts');
  const dirPath = splitPath.splice(0, splitPath.length - 1).join('/') + '/';
  const libFilePath = dirPath + libFileName;

  if (!fs.existsSync(libFilePath)) {
    if (!hideLog) {
      log(`Lib file not found: ${libFilePath}`, 'error');
    }

    return null;
  }

  return libFilePath;
}

export function computeRelatedVmcPath(fromFilePath, hideLog = false) {
  const splitPath = fromFilePath.split('/');

  const vmcFileName = splitPath.at(-1).replace('.scss', '.vmc.ts').replace('.i18n.json', '.vmc.ts');
  const dirPath = splitPath.splice(0, splitPath.length - 1).join('/') + '/';
  const vmcFilePath = dirPath + vmcFileName;

  if (!fs.existsSync(vmcFilePath)) {
    if (!hideLog) {
      log(`Vmc file not found: ${vmcFilePath}`, 'error');
    }

    return null;
  }

  return vmcFilePath;
}

export function computeRelatedVuePath(fromFilePath, hideLog = false) {
  const splitPath = fromFilePath.split('/');

  const vueFileName = splitPath
    .at(-1)
    .replace('.vmc.ts', '.vue')
    .replace('.vmc.js', '.vue')
    .replace('.scss', '.vue')
    .replace('.i18n.json', '.vue');
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

export function getCopyright() {
  return `// Copyright © Sutoiku, Inc. ${new Date().getFullYear()}. All Rights Reserved.`;
}

export function getCSSClasses(ast, ignoreDeep = false) {
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

  return classes.filter((it) => !isClassIgnored(it));
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

export function isClassIgnored(className) {
  return IGNORED_CLASSES.includes(className) || isMarginPaddingClass(className) || className.startsWith('v-');
}

export function isValidHtmlAttribute(attribute) {
  return VALID_HTML_ATTRIBUTES.has(attribute) || attribute.startsWith('data-');
}

export function isValidHtmlTag(tag) {
  return VALID_HTML_TAGS.has(tag);
}

export function kebabize(str) {
  return str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
}

function isMarginPaddingClass(className) {
  return className.length < 8 && (className.at(0) === 'p' || className.at(0) === 'm') && className.at(2) === '-';
}
