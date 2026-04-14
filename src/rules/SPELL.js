import { lint } from 'cspell';

const config = new URL('../../cspell/cspell.json', import.meta.url).pathname;

const dico = [];
export default {
  validate: async (index) => {
    const filePaths = index.allFiles;
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

    await lint(filePaths, { config }, reporter);
    return { errors };
  },
};
