import { lint } from 'cspell';
import path from 'node:path';
import { cacheDirectory } from '../cache.js';

const config = new URL('../../cspell/cspell.json', import.meta.url).pathname;
const cacheLocation = path.join(cacheDirectory('cspell'), '.cspellcache');

const dico = [];
export default {
  validate: async (index) => {
    const filePaths = index.allFiles.filter((filePath) => !filePath.endsWith('.ipynb'));
    const errors = [];

    const reporter = {
      issue(issue) {
        dico.push(issue.text);
        errors.push({
          filePath: issue.uri?.replace('file://', '') || issue.filename,
          line: issue.row,
          message: `Unknown word: ${issue.text}`,
        });
      },
    };

    await lint(filePaths, { config, cache: true, cacheStrategy: 'content', cacheLocation }, reporter);
    return { errors };
  },
};
