module.exports = {
  addBundleToAlgoliaIndex,
  deleteBundleFromAlgoliaIndex,
  updateBundleInAlgoliaIndex,
};

const algoliasearch = require("algoliasearch");
const functions = require("firebase-functions");
const client = algoliasearch(
  functions.config().algolia.app_id,
  functions.config().algolia.read_write_api_key
);
const index = client.initIndex(functions.config().algolia.bundles_index_name);

function addBundleToAlgoliaIndex(bundleId, bundle) {
  return index.addObject(transformBundleForAlgolia(bundleId, bundle));
}

function updateBundleInAlgoliaIndex(bundleId, bundle) {
  return index.partialUpdateObject(transformBundleForAlgolia(bundleId, bundle));
}

function deleteBundleFromAlgoliaIndex(bundleId) {
  return index.deleteObject(bundleId);
}

function transformBundleForAlgolia(bundleId, bundle) {
  return {
    objectID: bundleId,
    title: bundle.title,
    subtitle: bundle.subtitle,
    text: bundle.text,
    _geoloc: {
      lat: bundle.lat,
      lng: bundle.lng,
    },
    categories: bundle.categories ? Object.keys(bundle.categories) : [],
    thumbPhoto: bundle.thumbPhoto,
    coverPhoto: bundle.coverPhoto,
    places: bundle.places,
  };
}
