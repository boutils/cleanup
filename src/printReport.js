const DEFAULT_COLOR = '\x1b[0m';

const COLOR_FROM_TYPE = {
  comment: '\x1b[36m%s\x1b[0m',
  error: '\x1b[31m%s\x1b[0m',
  info: '\x1b[1m%s\x1b[0m',
  ok: '\x1b[32m%s\x1b[0m',
  warning: '\x1b[33m%s\x1b[0m',
};

export function printReport(errorsByPath) {
  const filesInErrorsCount = Object.keys(errorsByPath).length;

  let errorsCount = 0;
  for (const errors in Object.values(errorsByPath)) {
    errorsCount += errors.length;
  }

  if (filesInErrorsCount > 0) {
    log('**************************************************************************', 'comment');
    log(`  ❌ ${filesInErrorsCount} file(s) with ${errorsCount} error(s) found`, 'warning');
    log('**************************************************************************', 'comment');
  } else {
    log('  ✅ All good', 'ok');
  }

  for (const [filePath, errors] of Object.entries(errorsByPath)) {
    const fileName = filePath.split('/').pop();
    log(`\n${fileName}`, 'info');

    const link = errors[0]?.line ? `${filePath}:${errors[0].line}` : filePath;

    log(link, 'path');

    for (const error of errors) {
      const lineMsg = error.line ? `[line ${error.line}] ` : '';
      log(`\t${lineMsg}(${error.type}) ${error.message}`, 'warning');
    }
  }
}

function log(message, type) {
  console.log(COLOR_FROM_TYPE[type] || DEFAULT_COLOR, message); // eslint-disable-line no-console
}
