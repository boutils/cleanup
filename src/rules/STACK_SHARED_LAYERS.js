import { getSortingError } from '../utils.js';

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

      let allJsonString = '';
      for (const { json } of index.stacks.list) {
        const string = JSON.stringify(json);
        allJsonString += string.replace(/\s/g, '');
      }

      for (const layerId of keys) {
        if (allJsonString.includes(`"id":"${layerId}"`)) {
          continue;
        }

        errors.push({
          filePath: index.stacks.spec.path,
          line: index.stacks.spec.json.layers[layerId].line,
          message: `Layer "${layerId}" is defined in shared layers but not used in any card.`,
        });
      }
    }

    const doublons = tryToFindDoublons(index.stacks);

    if (doublons.length > 0) {
      errors.push(
        ...doublons.map(({ existing, current }) => ({
          filePath: current.filePath,
          message: `[${getLayerRefText(current.cardKey, current.cardIndex, current.layerIndex)}] has a doublon in [${existing.filePath.split('/').pop()} ${getLayerRefText(existing.cardKey, existing.cardIndex, existing.layerIndex)}]. Use a shared layer.`,
        }))
      );
    }
    return { errors };
  },
};

function tryToFindDoublons(stacks) {
  const doublons = [];
  const layersHashsByFile = new Map();
  for (const { path: filePath, json } of stacks.list) {
    for (const cardKey of Object.keys(json.cards) || []) {
      const cardFace = json.cards[cardKey];
      for (const [cardIndex, card] of Object.entries(cardFace) || []) {
        for (const [layerIndex, layer] of Object.entries(card.layers) || []) {
          const string = layer.ticker + layer.visual?.id + JSON.stringify(layer.metrics) + JSON.stringify(layer.series);
          const hash = simpleHash(string.replace(/\s/g, ''));

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
            // console.log(
            //   `Layer ${getLayerRefText(cardKey, cardIndex, layerIndex)} is identical to layer ${getLayerRefText(existingCardKey, existingCardIndex, existingLayerIndex)} in the same file. Consider using shared layers.`
            // );
          }
          layersHashsByFile.set(hash, { filePath, cardKey, cardIndex, layerIndex });
        }
      }
    }
  }

  return doublons;
  //console.log('layersHashsByFile', layersHashsByFile);
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
