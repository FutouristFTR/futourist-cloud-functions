module.exports = {
  addOutfitToAlgoliaIndex,
  deleteOutfitFromAlgoliaIndex,
  updateOutfitInAlgoliaIndex,
};

const algoliasearch = require("algoliasearch");
const functions = require("firebase-functions");
const client = algoliasearch(
  functions.config().algolia.app_id,
  functions.config().algolia.read_write_api_key
);
const index = client.initIndex(functions.config().algolia.outfits_index_name);

function addOutfitToAlgoliaIndex(outfitId, outfit) {
  return index.addObject(transformOutfitForAlgolia(outfitId, outfit));
}

function updateOutfitInAlgoliaIndex(outfitId, outfit) {
  return index.partialUpdateObject(transformOutfitForAlgolia(outfitId, outfit));
}

function deleteOutfitFromAlgoliaIndex(outfitId) {
  return index.deleteObject(outfitId);
}

function transformOutfitForAlgolia(outfitId, outfit) {
  return {
    objectID: outfitId,
    title: outfit.title,
    subtitle: outfit.subtitle,
    _geoloc: {
      lat: outfit.lat,
      lng: outfit.lng,
    },
    morning: outfit.morning,
    day: outfit.day,
    evening: outfit.evening,
    categories: outfit.categories ? Object.keys(outfit.categories) : [],
    thumbPhoto: outfit.thumbPhoto,
    coverPhoto: outfit.coverPhoto,
  };
}
