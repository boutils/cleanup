import { getSortingError } from '../utils.js';

export default {
  validate: async (index) => {
    const errors = [];

    if (index.stacks.spec.json.layers) {
      const keys = Object.keys(index.stacks.spec.json.layers);
      for (const layerId of keys) {
        const sharedLayer = index.stacks.spec.json.layers[layerId];
        const layerErrors = checkLayer(index.stacks.spec.path, layerId, '', '', sharedLayer, 2);
        if (layerErrors) {
          errors.push(...layerErrors);
        }
      }
    }

    for (const { path: filePath, json } of index.stacks.list) {
      for (const cardKey of Object.keys(json.cards) || []) {
        const cardFace = json.cards[cardKey];
        for (const [cardIndex, card] of Object.entries(cardFace) || []) {
          for (const [layerIndex, layer] of Object.entries(card.layers) || []) {
            if (layer.referenceId && !index.stacks.spec.json.layers?.[layer.referenceId]) {
              errors.push({
                filePath,
                line: layer.title?.line,
                message: `[${getLayerRefText(cardKey, cardIndex, layerIndex)}]: Layer id "${layer.referenceId}" not found in shared layers.`,
              });
              break;
            }

            const layerSpec = { ...layer, ...index.stacks.spec.json.layers?.[layer.referenceId] };
            const layerErrors = checkLayer(filePath, cardKey, cardIndex, layerIndex, layerSpec, card.layers.length);
            if (layerErrors) {
              errors.push(...layerErrors);
            }
          }
        }
      }
    }

    return { errors };
  },
};

function checkLayer(filePath, cardKey, cardIndex, layerIndex, layer, layersCount) {
  const errors = [];

  // Check layer title
  if (layersCount > 1 && (!layer.title || typeof layer.title !== 'string' || layer.title.trim() === '')) {
    errors.push({
      filePath,
      line: layer.title?.line,
      message: `[${getLayerRefText(cardKey, cardIndex, layerIndex)}]: "title" property is required when there are multiple layers or for a shared layer.`,
    });
  }

  // Check views property
  if (layer.views && layer.views.length === 2) {
    errors.push({
      filePath,
      line: layer.views[1].line,
      message: `[${getLayerRefText(cardKey, cardIndex, layerIndex)}]: Remove "views" property, it is not required with 2 views.`,
    });
  }

  // Check metrics property
  if (layer.metrics?.columns && layer.metrics?.columns === 1) {
    errors.push({
      filePath,
      line: layer.metrics.columns.line,
      message: `[${getLayerRefText(cardKey, cardIndex, layerIndex)}]: Remove "metrics.columns" property, it is not required with 1 column.`,
    });
  }

  // Check mapping metrics overview
  if (layer.mapping?.metrics && !layer.mapping.metrics.some((m) => m.overview === true)) {
    errors.push({
      filePath,
      line: undefined,
      message: `[${getLayerRefText(cardKey, cardIndex, layerIndex)}]: At least one metric in mapping/metrics should have "overview": true.`,
    });
  }

  // Check notebook parameters sort
  if (layer.series?.parameters) {
    const parametersNotebookNames = Object.keys(layer.series?.parameters);
    const sortingErrors = getSortingError(parametersNotebookNames);

    if (sortingErrors) {
      errors.push({
        filePath,
        line: sortingErrors.lineNumber,
        message: `[${getLayerRefText(cardKey, cardIndex, layerIndex)}]: ${sortingErrors}`,
      });
    }
  }

  // Check empty visual options
  if (layer.visual?.options && Object.keys(layer.visual.options).length === 0) {
    errors.push({
      filePath,
      line: layer.visual.options.line,
      message: `[${getLayerRefText(cardKey, cardIndex, layerIndex)}]: Remove empty "visual.options" property.`,
    });
  }

  return errors;
}

function getLayerRefText(cardKey, cardIndex, layerIndex) {
  return `${cardKey}-${Number(cardIndex) + 1}, (Layer ${Number(layerIndex) + 1})`;
}
