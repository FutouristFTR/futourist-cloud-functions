const collections = require("../../constants/collections");
const admin = require("firebase-admin");
require("firebase/storage");

module.exports = async function derivativeCleaner(object) {
  const bucket = admin.storage().bucket(object.bucket);
  const filePath = object.name;
  const collectionFolder = filePath.split("/")[0];

  if (
    [collections.REVIEWS, collections.PLACES, collections.BUNDLES, collections.OUTFITS].indexOf(
      collectionFolder
    ) < 0
  ) {
    // Cancel if image OK not meant for resizing
    return false;
  }

  return bucket.deleteFiles({ prefix: filePath.split(".")[0] });
};
