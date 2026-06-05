import { getSortingError, isLayerUsedByAnyCard } from '../utils.js';

const COUNT_OF_DIFFERENT_PROPERTIES_TO_CONSIDER_AS_DOUBLON = 3;

export default {
  validate: async (index) => {
    const errors = [];

    if (index.stacks.spec.json.layers) {
      const keys = Object.keys(index.stacks.spec.json.layers);
      const sortingErrors = getSortingError(keys);
      if (sortingErrors) {
        errors.push({
          filePath: index.stacks.spec.path,
          line: sortingErrors.lineNumber,
          message: `Layer ${sortingErrors}`,
        });
      }

      for (const layerId of keys) {
        if (!isLayerUsedByAnyCard(layerId, index, true)) {
          errors.push({
            filePath: index.stacks.spec.path,
            line: index.stacks.spec.json.layers[layerId].line,
            message: `Layer "${layerId}" is defined in shared layers but not used in any card.`,
          });
        }
      }
    }

    const doublonsByHash = tryToFindDoublonsByHash(index.stacks);

    if (doublonsByHash.length > 0) {
      errors.push(
        ...doublonsByHash.map(({ existing, current }) => {
          const fileName = existing.filePath.split('/').pop();

          return {
            filePath: current.filePath,
            message:
              fileName === 'stacks.json'
                ? `[${getLayerRefText(current.cardKey, current.cardIndex, current.layerIndex)}] Use existing shared layer "${existing.cardKey}".`
                : `[${getLayerRefText(current.cardKey, current.cardIndex, current.layerIndex)}] has a doublon in [${fileName} ${getLayerRefText(existing.cardKey, existing.cardIndex, existing.layerIndex)}]. Use a shared layer.`,
          };
        })
      );
    }

    const doublonsByTitle = tryToFindDoublonsByTitle(index.stacks, doublonsByHash);
    if (doublonsByTitle.length > 0) {
      errors.push(
        ...doublonsByTitle.map(({ existing, current, replacement }) => {
          const fileName = existing.filePath.split('/').pop();

          return {
            filePath: current.filePath,
            message:
              fileName === 'stacks.json'
                ? `[${getLayerRefText(current.cardKey, current.cardIndex, current.layerIndex)}] Replace with following shared layer: ${replacement}`
                : `[${getLayerRefText(current.cardKey, current.cardIndex, current.layerIndex)}] has a doublon in [${fileName} ${getLayerRefText(existing.cardKey, existing.cardIndex, existing.layerIndex)}]. Use a shared layer, there is less than ${COUNT_OF_DIFFERENT_PROPERTIES_TO_CONSIDER_AS_DOUBLON} different properties.`,
          };
        })
      );
    }

    return { errors };
  },
};

function tryToFindDoublonsByTitle(stacks, doublonsByHash) {
  const doublons = [];
  const layersTitlesByFile = new Map();

  for (const [sharedLayerId, layer] of Object.entries(stacks.spec.json.layers || {})) {
    const title = computeLayerTitle(layer);
    if (!title) {
      continue; // skip layers without a valid title
    }

    layersTitlesByFile.set(title, {
      filePath: stacks.spec.path,
      cardKey: sharedLayerId,
      cardIndex: '',
      layerIndex: '',
      layer,
    });
  }

  for (const { path: filePath, json } of stacks.list) {
    for (const cardKey of Object.keys(json.cards) || []) {
      const cardFace = json.cards[cardKey];
      for (const [cardIndex, card] of Object.entries(cardFace) || []) {
        for (const [layerIndex, layer] of Object.entries(card.layers) || []) {
          if (layer.referenceId && stacks.spec.json.layers?.[layer.referenceId]) {
            continue; // skip layers that already reference an existing shared layer
          }

          const title = computeLayerTitle(layer);
          if (!title) {
            continue; // skip layers without a valid title
          }

          if (layersTitlesByFile.has(title)) {
            const existingLayerInfo = layersTitlesByFile.get(title);
            const res = studyObjectDiff(existingLayerInfo.layer, layer);
            if (
              res.canBeReplaced &&
              Object.keys(res.diff).length <= COUNT_OF_DIFFERENT_PROPERTIES_TO_CONSIDER_AS_DOUBLON
            ) {
              const {
                filePath: existingFilePath,
                cardKey: existingCardKey,
                cardIndex: existingCardIndex,
                layerIndex: existingLayerIndex,
              } = existingLayerInfo;

              doublons.push({
                existing: {
                  filePath: existingFilePath,
                  cardKey: existingCardKey,
                  cardIndex: existingCardIndex,
                  layerIndex: existingLayerIndex,
                },
                current: { filePath, cardKey, cardIndex, layerIndex },
                replacement: computeReplacement(res.diff, existingCardKey),
              });
            }
          }
          layersTitlesByFile.set(title, { filePath, cardKey, cardIndex, layerIndex });
        }
      }
    }
  }

  return doublons.filter(
    (it) =>
      !doublonsByHash.some(
        (hashDoublon) =>
          (hashDoublon.existing.filePath === it.existing.filePath &&
            hashDoublon.existing.cardKey === it.existing.cardKey) ||
          (hashDoublon.current.filePath === it.current.filePath && hashDoublon.current.cardKey === it.current.cardKey)
      )
  );
}

function computeReplacement(diff, existingCardKey) {
  const replacement = existingCardKey ? { referenceId: existingCardKey } : {};
  for (const key of Object.keys(diff)) {
    if ('new' in diff[key]) {
      replacement[key] = diff[key].new;
    } else {
      replacement[key] = computeReplacement(diff[key]);
    }
  }

  return existingCardKey ? JSON.stringify(replacement) : replacement;
}

function tryToFindDoublonsByHash(stacks) {
  const doublons = [];
  const layersHashsByFile = new Map();

  for (const [sharedLayerId, layer] of Object.entries(stacks.spec.json.layers || {})) {
    const hash = computeLayerHash(layer);
    layersHashsByFile.set(hash, { filePath: stacks.spec.path, cardKey: sharedLayerId, cardIndex: '', layerIndex: '' });
  }

  for (const { path: filePath, json } of stacks.list) {
    for (const cardKey of Object.keys(json.cards) || []) {
      const cardFace = json.cards[cardKey];
      for (const [cardIndex, card] of Object.entries(cardFace) || []) {
        for (const [layerIndex, layer] of Object.entries(card.layers) || []) {
          if (layer.referenceId && stacks.spec.json.layers?.[layer.referenceId]) {
            continue; // skip layers that already reference an existing shared layer
          }

          const hash = computeLayerHash(layer);

          if (layersHashsByFile.has(hash)) {
            const {
              filePath: existingFilePath,
              cardKey: existingCardKey,
              cardIndex: existingCardIndex,
              layerIndex: existingLayerIndex,
            } = layersHashsByFile.get(hash);
            doublons.push({
              existing: {
                filePath: existingFilePath,
                cardKey: existingCardKey,
                cardIndex: existingCardIndex,
                layerIndex: existingLayerIndex,
              },
              current: { filePath, cardKey, cardIndex, layerIndex },
            });
          }
          layersHashsByFile.set(hash, { filePath, cardKey, cardIndex, layerIndex });
        }
      }
    }
  }

  return doublons;
}

function computeLayerTitle(layer) {
  if (!layer.title || typeof layer.title !== 'string' || layer.title.trim() === '') {
    return;
  }

  return layer.title.trim().toLowerCase();
}

function computeLayerHash(layer) {
  const string =
    '' +
    layer.ticker +
    JSON.stringify(layer.visual) +
    JSON.stringify(layer.metrics) +
    JSON.stringify(layer.series) +
    JSON.stringify(layer.mapping);

  return simpleHash(string.replace(/\s/g, ''));
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit int
  }
  return hash;
}

function getLayerRefText(cardKey, cardIndex, layerIndex) {
  return `${cardKey}-${Number(cardIndex) + 1}, (Layer ${Number(layerIndex) + 1})`;
}

function studyObjectDiff(obj1, obj2) {
  let canBeReplaced = true;
  const diff = {};

  const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

  for (const key of keys) {
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];

    // Property removed
    if (!(key in (obj2 || {}))) {
      if (Array.isArray(val1)) {
        canBeReplaced = false; // can't automatically replace if there's an array difference
      }

      diff[key] = { old: val1, new: undefined };
      continue;
    }

    // Property added
    if (!(key in (obj1 || {}))) {
      diff[key] = { old: undefined, new: val2 };
      continue;
    }

    // Nested object
    if (
      val1 &&
      val2 &&
      typeof val1 === 'object' &&
      typeof val2 === 'object' &&
      !Array.isArray(val1) &&
      !Array.isArray(val2)
    ) {
      const res = studyObjectDiff(val1, val2);

      if (Object.keys(res.diff).length > 0) {
        diff[key] = res.diff;
      }
      if (!res.canBeReplaced) {
        canBeReplaced = false;
      }
    }
    // Primitive / array difference
    else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      if (Array.isArray(val1)) {
        canBeReplaced = false; // can't automatically replace if there's an array difference
      }

      diff[key] = { old: val1, new: val2 };
    }
  }

  return { canBeReplaced, diff };
}
