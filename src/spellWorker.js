import { lint } from 'cspell';
import { parentPort, workerData } from 'node:worker_threads';

const { filePaths, config, cacheLocation } = workerData;
const errors = [];

await lint(
  filePaths,
  { config, cache: true, cacheStrategy: 'content', cacheLocation },
  {
    issue(issue) {
      errors.push({
        filePath: issue.uri?.replace('file://', '') || issue.filename,
        line: issue.row,
        message: `Unknown word: ${issue.text}`,
      });
    },
  }
);

parentPort.postMessage(errors);
