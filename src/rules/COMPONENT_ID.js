export default {
  validate: (index) => {
    const filePaths = index.byType['vue'].concat(index.byType['lib'].filter((it) => it.includes('.vmc.')));

    const errors = [];
    for (const filePath of filePaths) {
      const componentId = getComponentId(filePath);
      const normalizedComponentId = createComponentId(componentId);
      if (normalizedComponentId !== componentId && !errors.find((error) => error.filePath.includes(componentId))) {
        errors.push({
          filePath: filePath,
          line: null,
          message: `Rename component with id '${normalizedComponentId}'`,
        });
      }
    }

    return { errors };
  },
};

function createComponentId(str, noSlug) {
  if (typeof str !== 'string') {
    return '_';
  }

  const firstChar = str.charAt(0);
  const lastChar = str.charAt(str.length - 1);

  if ((firstChar === '"' && lastChar === '"') || (firstChar === "'" && lastChar === "'")) {
    str = str.substring(1, str.length - 1);
  }

  let id = str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9$_-]+/g, '_');

  if (!noSlug) {
    id = id.replace(/__+/g, '_').replace(/(^_)|(_$)/g, '');
  }

  if (/^\d/.test(id)) {
    id = '_' + id;
  }

  if (!id.startsWith('stoic-')) {
    id = `stoic-${id}`;
  }

  return id.replaceAll('_', '-');
}

function getComponentId(filePath) {
  return filePath.split('/').pop().replace('.vmc.ts', '').replace('.vue', '');
}
