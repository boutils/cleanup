const COPYRIGHT = `// Copyright © Sutoiku, Inc. ${new Date().getFullYear()}. All Rights Reserved.`;

export default {
  validate: (index) => {
    const filesPaths = index.byType['lib'].filter((it) => !it.includes('jupyter-ext-minimal-ui/'));

    const errors = [];
    for (const filePath of filesPaths) {
      const { lines } = index.byPath[filePath];
      const firstLine = lines[0];
      if (firstLine && String(firstLine).trim() !== String(COPYRIGHT).trim()) {
        errors.push({
          filePath,
          line: 1,
          message: 'Missing or invalid copyright',
        });
      }
    }

    return { errors };
  },
};
