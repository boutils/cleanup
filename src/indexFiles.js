import Vuedoc from '@vuedoc/parser';
import JavascriptLoader from '@vuedoc/parser/loader/javascript.js';
import TypescriptLoader from '@vuedoc/parser/loader/typescript.js';
import fs from 'fs';
import path from 'path';
import { computeHTMLLineInfo } from './computeHTMLLineInfo.js';

const DIRECTORIES = ['apps', 'libs'];
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
  const index = { byPath: {}, byType: {} };

  for (const filePath of filesPaths) {
    const extension = path.extname(filePath);

    if (!isIgnoredFile(extension)) {
      const fileType = TYPE_FROM_EXTENSION[extension];
      if (!fileType) {
        throw new Error(`Unknown type for extension '${extension}'`);
      }

      index.byPath[filePath] = await indexFile(filePath, fileType);
      index.byType[TYPE_FROM_EXTENSION[extension]] ??= [];
      index.byType[TYPE_FROM_EXTENSION[extension]].push(filePath);
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

  if (fileType === 'vue' || fileType === 'template') {
    result.linesInfo = indexHTMLFile(lines);
  }

  if (filePath.includes('.vmc.')) {
    result.vmc = await indexVmcFile(filePath, content, lines);
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

  return result;
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

function isIgnoredFile(extension) {
  if (!KEEP_ONLY_EXTENSIONS.has(extension)) {
    return true;
  }

  return false;
}

function isMatchingFilter(fileName, filter) {
  return !filter || fileName.endsWith(filter);
}
