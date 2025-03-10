const ignoredFiles = ['libs/typescript/components/shared/plugins/helpers/assertions.ts'];

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib']
      .concat(index.byType['vmc'])
      .filter((it) => !it.includes('jupyter-ext-minimal-ui/') && !it.endsWith('.js'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];

      for (const [lineIndex, line] of lines.entries()) {
        const trimmedLine = line?.trim();
        const trimmedPreviousLineInfo = lines[lineIndex - 1]?.trim();
        const nextLineInfo = lines[lineIndex + 1] || {};

        if (
          (trimmedLine.startsWith('function ') ||
            trimmedLine.startsWith('async function ') ||
            trimmedLine.startsWith('export function ') ||
            trimmedLine.startsWith('export async function ')) &&
          trimmedPreviousLineInfo !== '' &&
          trimmedPreviousLineInfo !== '*/' &&
          !trimmedPreviousLineInfo.startsWith('//') &&
          !ignoredFiles.includes(filePath)
        ) {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'Add an empty line before.',
          });
        }

        if (
          line.length > 0 &&
          (trimmedLine.startsWith('case ') || trimmedLine === 'default:') &&
          trimmedPreviousLineInfo !== '' &&
          !trimmedPreviousLineInfo.endsWith('{') &&
          !trimmedPreviousLineInfo.includes('case ')
        ) {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'Add an empty line before.',
          });
        }

        if (
          line.length > 0 &&
          trimmedLine === '}' &&
          nextLineInfo?.length > 0 &&
          !nextLineInfo.trim().startsWith('}') &&
          !nextLineInfo.trim().startsWith('break;') &&
          !nextLineInfo.trim().startsWith('else') &&
          !nextLineInfo.trim().startsWith(']') &&
          !nextLineInfo.trim().startsWith(':') &&
          !nextLineInfo.trim() === '`;'
        ) {
          errors.push({
            filePath,
            line: lineIndex + 1,
            message: 'Add an empty line',
          });
        }
      }
    }

    return { errors };
  },
};
