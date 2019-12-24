module.exports = {
  addPlaceToAlgoliaIndex,
  deletePlaceFromAlgoliaIndex,
  updatePlaceInAlgoliaIndex,
};

const algoliasearch = require("algoliasearch");
const functions = require("firebase-functions");
const client = algoliasearch(
  functions.config().algolia.app_id,
  functions.config().algolia.read_write_api_key
);
const index = client.initIndex(functions.config().algolia.places_index_name);

function addPlaceToAlgoliaIndex(placeId, place) {
  return index.addObject(transformPlaceForAlgolia(placeId, place));
}

function updatePlaceInAlgoliaIndex(placeId, place) {
  return index.partialUpdateObject(transformPlaceForAlgolia(placeId, place));
}

function deletePlaceFromAlgoliaIndex(placeId) {
  return index.deleteObject(placeId);
}

function transformPlaceForAlgolia(placeId, place) {
  let latestReviews = place.latestReviews
    ? place.latestReviews.map(review => {
        return {
          mediaId: review.mediaId,
          created: review.created,
          type: review.type,
        };
      })
    : null;
  return {
    objectID: placeId,
    name: place.name,
    city: place.city,
    tags: place.tags,
    pitch: place.pitch,
    _geoloc: {
      lat: place.lat,
      lng: place.lng,
    },
    categories: place.categories ? Object.keys(place.categories) : [],
    photo: place.photos && place.photos.length ? place.photos[0] : null,
    latestReviews: latestReviews,
    rating: place.rating ? place.rating : null,
    ratingCount: place.ratingCount ? place.ratingCount : null,
  };
}
