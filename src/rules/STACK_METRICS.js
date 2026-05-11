export default {
  validate: async (index) => {
    const errors = [];

    for (const { path: filePath, json } of index.stacks.list) {
      for (const cardKey of Object.keys(json.cards) || []) {
        const cardFace = json.cards[cardKey];
        for (const [cardIndex, card] of Object.entries(cardFace) || []) {
          //if (cardKey === 'center' || cardKey === 'footer') {
          for (const [layerIndex, layer] of Object.entries(card.layers) || []) {
            const layerSpec = { ...layer, ...index.stacks.spec.json.layers?.[layer.referenceId] };

            const layerErrors = checkLayerDecimals(filePath, cardKey, cardIndex, layerIndex, layerSpec);
            if (layerErrors) {
              errors.push(...layerErrors);
            }
          }
          //}
        }
      }
    }

    return { errors };
  },
};

function checkLayerDecimals(filePath, cardKey, cardIndex, layerIndex, layer) {
  const errors = [];

  if (layer.mapping.metrics) {
    checkDecimals('metrics', errors, filePath, cardKey, cardIndex, layerIndex, layer);
  }

  if (layer.mapping.summaries) {
    checkDecimals('summaries', errors, filePath, cardKey, cardIndex, layerIndex, layer);
  }

  return errors;
}

function checkDecimals(type, errors, filePath, cardKey, cardIndex, layerIndex, layer) {
  const refDecimals = { value: undefined, percentage: undefined };

  for (const metric of layer.mapping[type]) {
    if (layer.mapping[type].length === 1) {
      continue;
    }

    const isFixed = metric.format?.decimals?.mode === 'fixed' || !metric.format || metric.format.mode === 'volume';
    if (!isFixed) {
      errors.push({
        filePath,
        message: `[${getMetricRefText(type, metric, cardKey, cardIndex, layerIndex)}]: "${type}.format.decimals.mode" should be "fixed" when there are multiple metrics.`,
      });
      continue;
    }

    const decimals = metric.format?.decimals?.count;
    const mode = metric.format?.mode || 'value';

    if (
      refDecimals[mode] === undefined &&
      !isNaN(decimals) &&
      metric.label !== 'Count' &&
      metric.label !== '#' &&
      metric.name !== 'Rank'
    ) {
      refDecimals[mode] = decimals;
      continue;
    }

    if (decimals !== undefined && refDecimals[mode] !== undefined && decimals !== refDecimals[mode]) {
      errors.push({
        filePath,
        message: `[${getMetricRefText(type, metric, cardKey, cardIndex, layerIndex)}]: Inconsistent decimals count across ${type}. Expected ${refDecimals[mode]} but got ${JSON.stringify(decimals)}.`,
      });
    }
  }
}

function getMetricRefText(type, metric, cardKey, cardIndex, layerIndex) {
  return `${cardKey}-${Number(cardIndex) + 1}, (Layer ${Number(layerIndex) + 1}), ${type}: ${metric.name || metric.label}`;
}
