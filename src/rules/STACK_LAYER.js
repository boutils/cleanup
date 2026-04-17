import { getSortingError } from '../utils.js';

export default {
  validate: async (index) => {
    const errors = [];

    for (const { path: filePath, json } of index.stacks.list) {
      for (const cardKey of Object.keys(json.cards) || []) {
        const cardFace = json.cards[cardKey];
        for (const [cardIndex, card] of Object.entries(cardFace) || []) {
          for (const [layerIndex, layer] of Object.entries(card.layers) || []) {
            const layerErrors = checkLayer(filePath, cardKey, cardIndex, layerIndex, layer, card.layers.length);
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
      message: `[${getLayerRefText(cardKey, cardIndex, layerIndex)}]: "title" property is required when there are multiple layers.`,
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

  return errors;
}

function getLayerRefText(cardKey, cardIndex, layerIndex) {
  return `${cardKey}-${Number(cardIndex) + 1}, (Layer ${Number(layerIndex) + 1})`;
}
