const MAX_METRICS_ALLOWED = {
  bottom: 5,
  bottomInner: 5,
  center: 8,
  left: 5,
  right: 8,
  top: 8,
  topInner: 8,
};

export default {
  validate: async (index) => {
    const errors = [];

    for (const { path: filePath, json } of index.stacks.list) {
      for (const cardKey of Object.keys(json.cards) || []) {
        const cardFace = json.cards[cardKey];
        for (const [cardIndex, card] of Object.entries(cardFace) || []) {
          checkMetricsCount('metrics', errors, filePath, cardKey, cardIndex, card.layers, index);
          checkMetricsCount('summaries', errors, filePath, cardKey, cardIndex, card.layers, index);

          for (const [layerIndex, layer] of Object.entries(card.layers) || []) {
            const layerSpec = getLayer(layer, index);

            const layerErrors = checkLayer(filePath, cardKey, cardIndex, layerIndex, layerSpec);
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

function checkLayer(filePath, cardKey, cardIndex, layerIndex, layer) {
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

    if (metric.format?.prefix === '$' && metric.format.decimals?.mode === 'fixed') {
      if (metric.format.mode === 'volume' && metric.format.decimals?.count !== 1) {
        errors.push({
          filePath,
          message: `[${getMetricRefText(type, metric, cardKey, cardIndex, layerIndex)}]: For currency "$" metrics with "volume" mode, "decimals.count" should be 1. Found ${JSON.stringify(metric.format.decimals?.count)}.`,
        });
      } else if (metric.format.mode !== 'volume' && metric.format.decimals?.count !== 0) {
        errors.push({
          filePath,
          message: `[${getMetricRefText(type, metric, cardKey, cardIndex, layerIndex)}]: For currency "$" metrics with "fixed" mode, "decimals.count" should be 0. Found ${JSON.stringify(metric.format.decimals?.count)}.`,
        });
      }
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

    if (decimals !== undefined && refDecimals[mode] && decimals !== refDecimals[mode]) {
      errors.push({
        filePath,
        message: `[${getMetricRefText(type, metric, cardKey, cardIndex, layerIndex)}]: Inconsistent decimals count across ${type}. Expected ${refDecimals[mode]} but got ${JSON.stringify(decimals)}.`,
      });
    }
  }
}

function checkMetricsCount(type, errors, filePath, cardKey, cardIndex, layers, index) {
  const maxMetrics = MAX_METRICS_ALLOWED[cardKey];
  for (const resolutionType of ['intraday', 'historical']) {
    let metrics = [];
    const firstLayer = getLayer(layers[0], index);
    const columnCount = firstLayer?.mapping?.columns?.[type] || 1;
    for (const layerJson of layers) {
      const layer = getLayer(layerJson, index);

      if (layer.views && !layer.views.includes(resolutionType)) {
        continue;
      }

      const layerMetrics = layer.mapping?.[type] || [];
      for (const layerMetric of layerMetrics) {
        metrics.push(layerMetric.label || layerMetric.name);
      }

      // For center card, it is by layer in the right panel
      if (cardKey === 'center') {
        const metricsLength = metrics.length / columnCount;
        if (metricsLength > maxMetrics) {
          errors.push({
            filePath,
            message: `[${getCardRefText(cardKey, cardIndex)}] ${type}: Too many ${type}. Found ${metricsLength} but max is ${maxMetrics}. List of ${type}: ${metrics.join(', ')}.`,
          });
        }

        metrics = [];
      }
    }

    if (cardKey !== 'center') {
      const metricsLength = metrics.length / columnCount;
      if (metricsLength > maxMetrics) {
        errors.push({
          filePath,
          message: `[${getCardRefText(cardKey, cardIndex)}] ${type}: Too many ${type}. Found ${metricsLength} but max is ${maxMetrics}. List of ${type}: ${metrics.join(', ')}.`,
        });
      }
    }
  }
}

function getMetricRefText(type, metric, cardKey, cardIndex, layerIndex) {
  return `${getLayerRefText(cardKey, cardIndex, layerIndex)}}, ${type}: ${metric.name || metric.label}`;
}

function getLayerRefText(cardKey, cardIndex, layerIndex) {
  return `${getCardRefText(cardKey, cardIndex)}, (Layer ${Number(layerIndex) + 1})`;
}

function getCardRefText(cardKey, cardIndex) {
  return `${cardKey}-${Number(cardIndex) + 1}`;
}

function getLayer(spec, index) {
  return { ...index.stacks.spec.json.layers?.[spec.referenceId], ...spec };
}
