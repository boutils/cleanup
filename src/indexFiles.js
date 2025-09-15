import Vuedoc from '@vuedoc/parser';
import JavascriptLoader from '@vuedoc/parser/loader/javascript.js';
import TypescriptLoader from '@vuedoc/parser/loader/typescript.js';
import fs from 'fs';
import path from 'path';
import { parse } from 'scss-parser';
import { FunctionDeclaration, TypescriptParser } from 'typescript-parser';
import { computeHTMLLineInfo } from './computeHTMLLineInfo.js';

const parser = new TypescriptParser();
const DIRECTORIES = ['.storybook', 'src', 'scripts'];
const KEEP_ONLY_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.scss', '.ts', '.vue']);
const TYPE_FROM_EXTENSION = {
  '.css': 'style',
  '.html': 'template',
  '.js': 'lib',
  '.json': 'json',
  '.scss': 'style',
  '.ts': 'lib',
  '.vue': 'vue',
};

const JS_LOADER = Vuedoc.Loader.extend('js', JavascriptLoader);
const TS_LOADER = Vuedoc.Loader.extend('js', TypescriptLoader);

const TAG_WITHOUT_CLOSE = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);

export async function indexFiles() {
  const filesPaths = getFilesPathsFromDirectories(DIRECTORIES);
  const index = { allContent: '', byPath: {}, byType: {}, theme: {} };

  for (const filePath of filesPaths) {
    const extension = path.extname(filePath);

    if (!isIgnoredFile(filePath, extension)) {
      const fileType = TYPE_FROM_EXTENSION[extension];
      if (!fileType) {
        throw new Error(`Unknown type for extension '${extension}'`);
      }

      index.byPath[filePath] = await indexFile(filePath, fileType);
      index.allContent += index.byPath[filePath].content + '\n';
      index.byType[TYPE_FROM_EXTENSION[extension]] ??= [];
      index.byType[TYPE_FROM_EXTENSION[extension]].push(filePath);

      if (filePath.includes('.vmc.')) {
        index.byType.vmc ??= [];
        index.byType.vmc.push(filePath);
      }

      if (filePath.endsWith('theme.json')) {
        index.theme = indexThemeFile(index.byPath[filePath].content, filePath);
      }
    }
  }

  return index;
}

function getFilesPathsFromDirectories(directories, filter) {
  const files = [];
  for (const dir of directories) {
    const subfiles = getFilesPathsFromDirectory(dir, filter);
    files.push(...subfiles);
  }

  return files;
}

function getFilesPathsFromDirectory(directory, filter) {
  const files = [];

  if (!fs.existsSync(directory)) {
    return [];
  }

  const items = fs.readdirSync(directory);
  for (const item of items) {
    const itemPath = directory + '/' + item;
    const stat = fs.statSync(itemPath);

    if (stat.isFile()) {
      if (isMatchingFilter(itemPath, filter)) {
        files.push(itemPath);
      }
    } else if (stat.isDirectory() && !directory.endsWith('node_modules')) {
      const subfiles = getFilesPathsFromDirectory(itemPath).filter((it) => isMatchingFilter(it, filter));
      files.push(...subfiles);
    }
  }

  return files;
}

async function indexFile(filePath, fileType) {
  const content = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
  const lines = content.split('\n');
  const result = { content, lines };

  if (fileType === 'lib') {
    result.imports = getImportLines(lines);
    result.functions = await getFunctions(content);
  }

  if (fileType === 'vue' || fileType === 'template') {
    result.linesInfo = indexHTMLFile(lines);
  }

  if (filePath.includes('.vmc.')) {
    result.vmc = await indexVmcFile(filePath, content, lines);

    if (result.vmc.mixins.values.length > 1) {
      console.log('>>> Add Mixin to vmc...'); // eslint-disable-line no-console
    }
  }

  if (filePath.endsWith('.scss') || filePath.endsWith('.css')) {
    try {
      result.scss = indexCssFile(content);
    } catch (e) {
      console.error('Error in SCSS file:', filePath); // eslint-disable-line no-console
      console.error(e); // eslint-disable-line no-console
    }
  }

  return result;
}

async function indexVmcFile(filePath, content, lines) {
  const isTsFile = filePath.endsWith('.ts');
  const lang = isTsFile ? 'ts' : 'js';
  const loader = isTsFile ? TS_LOADER : JS_LOADER;

  const result = await Vuedoc.parse({
    filecontent: `<script lang="${lang}">${content}</script>`,
    loaders: [loader],
  });

  result.emits = findEmits(lines);
  result.watch = findWatch(lines);
  result.components = findComponents(lines);
  result.mixins = findMixins(lines);

  return result;
}

function indexCssFile(content) {
  const scss = content
    .replaceAll('@use ', '@import ')
    .replaceAll(' as theme;', ';')
    .replaceAll(' as variables;', ';')
    .replaceAll('theme.$', '$')
    .replaceAll('variables.$', '$');
  return { ast: parse(scss) };
}

function findComponents(lines) {
  const values = [];
  let isInsideComponents = false;

  const delimiter = 'components:';
  let lineIndex = -1;
  for (const [_lineIndex, line] of lines.entries()) {
    if (line.trim().startsWith(delimiter)) {
      lineIndex = _lineIndex;
      isInsideComponents = true;

      if (line.includes('},')) {
        isInsideComponents = false;
        const str = line.substr(line.indexOf(delimiter) + delimiter.length);

        const emitsInline = str.substr(0, str.indexOf('},') + 1).trim();
        values.push(...emitsInline.replace('{', '').replace('}', '').replaceAll(' ', '').split(','));
        break;
      }
    } else if (isInsideComponents) {
      if (line.includes('},')) {
        break;
      } else {
        values.push(line.replace(',', '').trim().replaceAll("'", ''));
      }
    }
  }

  return { lineIndex, values };
}

function findEmits(lines) {
  const values = [];
  let isInsideEmits = false;

  const delimiter = 'emits:';
  let lineIndex = -1;
  for (const [_lineIndex, line] of lines.entries()) {
    if (line.trim().startsWith(delimiter)) {
      lineIndex = _lineIndex;
      isInsideEmits = true;

      if (line.includes('],')) {
        isInsideEmits = false;
        const str = line.substr(line.indexOf(delimiter) + delimiter.length);

        const emitsInline = str.substr(0, str.indexOf('],') + 1).trim();
        values.push(...eval(emitsInline));
        break;
      }
    } else if (isInsideEmits) {
      if (line.includes('],')) {
        break;
      } else {
        values.push(line.replace(',', '').trim().replaceAll("'", ''));
      }
    }
  }

  return { lineIndex, values };
}

function findWatch(lines) {
  const watchs = [];
  let isInsideWatch = false;

  const delimiter = 'watch: {';
  let indentation = -1;
  for (const [lineIndex, line] of lines.entries()) {
    if (line.trim() === delimiter) {
      isInsideWatch = true;
      indentation = line.length - line.trim().length;
    } else if (isInsideWatch) {
      const currentIndentation = line.length - line.trim().length;
      if (currentIndentation === indentation + 2 && !line.trim().startsWith('//') && !line.trim().startsWith('},')) {
        let watcherName = line.trim().replaceAll("'", '').replace('async ', '');
        const indexOfColon = watcherName.indexOf(':');
        const indexOfParenthesis = watcherName.indexOf('(');
        if (indexOfColon > -1) {
          watcherName = watcherName.substring(0, indexOfColon);
        }

        if (indexOfParenthesis > -1) {
          watcherName = watcherName.substring(0, indexOfParenthesis);
        }

        watchs.push({ name: watcherName, lineIndex });
      }
    }
  }

  return watchs;
}

async function getFunctions(content) {
  const parsed = await parser.parseSource(content);
  return parsed.declarations.filter((it) => it instanceof FunctionDeclaration);
}

function getImportLines(lines) {
  const importLines = [];
  let isCurrentImportOnMultipleLines = false;
  let accumulateImport = [];
  let firstLineNumberOfImport = -1;
  let lastLineNumberOfImport = -1;
  for (const [lineIndex, line] of lines.entries()) {
    const lineNumber = lineIndex + 1;
    if (line.startsWith('import')) {
      firstLineNumberOfImport = firstLineNumberOfImport === -1 ? lineNumber : firstLineNumberOfImport;
      isCurrentImportOnMultipleLines = !line.includes(' from ') && !line.includes(';');
      if (!isCurrentImportOnMultipleLines) {
        importLines.push({ line, lineNumber });
      } else {
        accumulateImport = [line];
      }
    } else if (lineNumber > 10 && !isCurrentImportOnMultipleLines) {
      break;
    } else if (isCurrentImportOnMultipleLines && line.includes(' from ') && !line.trim().startsWith('//')) {
      accumulateImport = [...accumulateImport, line];
      importLines.push({ line: accumulateImport.join(''), lineNumber });
      accumulateImport = [];
      isCurrentImportOnMultipleLines = false;
    } else if (isCurrentImportOnMultipleLines) {
      accumulateImport.push(line);
    }
  }

  if (importLines.length > 0) {
    lastLineNumberOfImport = importLines.at(-1).lineNumber;
  }

  return { values: importLines, info: { firstLineNumberOfImport, lastLineNumberOfImport } };
}

function indexHTMLFile(lines) {
  const linesInfo = [];
  let currentBlockDepth = -1;

  for (const [lineIndex, line] of lines.entries()) {
    const lineNumber = lineIndex + 1;
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
  }

  return linesInfo;
}

function indexThemeFile(content, filePath) {
  return { vars: generateThemeVars(JSON.parse(content)), path: filePath };
}

function isIgnoredFile(filePath, extension) {
  if (filePath.includes('/dist/')) {
    return true;
  }

  if (!KEEP_ONLY_EXTENSIONS.has(extension)) {
    return true;
  }

  return false;
}

function isMatchingFilter(fileName, filter) {
  return !filter || fileName.endsWith(filter);
}

function findMixins(lines) {
  const mixins = [];
  let isInsideMixins = false;

  const delimiter = 'mixins:';
  let lineIndex = -1;
  for (const [_lineIndex, line] of lines.entries()) {
    if (line.trim().startsWith(delimiter)) {
      lineIndex = _lineIndex;
      isInsideMixins = true;

      if (line.includes('],')) {
        isInsideMixins = false;
        const str = line.substr(line.indexOf(delimiter) + delimiter.length);

        const emitsInline = str.substr(0, str.indexOf('],') + 1).trim();
        const str2 = emitsInline.substr(1, emitsInline.length - 2).replaceAll(' ', '');
        mixins.push(...str2.split(','));
        break;
      }
    } else if (isInsideMixins) {
      if (line.includes('],')) {
        break;
      } else {
        mixins.push(line.replace(',', '').trim().replaceAll("'", ''));
      }
    }
  }

  return { lineIndex, values: mixins };
}

function generateThemeVars(value, themeId = 'light', key = '', path = []) {
  const theme = [];

  if (isObject(value)) {
    if (typeof value.light === 'string' && typeof value.dark === 'string') {
      theme.push({ key: `$${key}`, value: value[themeId], path: path.filter((p) => p !== '').join('-') });
      return theme;
    }

    for (const [subItemKey, subItemValue] of Object.entries(value)) {
      const subKey = `${subItemKey}${capitalize(key)}`;
      theme.push(...generateThemeVars(subItemValue, themeId, subKey, [...path, key]));
    }
  } else {
    theme.push({ key: `$${key}`, value, path: path.filter((p) => p !== '').join('-') });
  }

  return theme;
}

export function capitalize(str) {
  if (str.length === 0) {
    return str;
  } else if (str.length === 1) {
    return str.toUpperCase();
  } else {
    return str[0].toUpperCase() + str.slice(1);
  }
}

export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
