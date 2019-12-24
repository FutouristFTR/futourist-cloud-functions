const collections = require("../../constants/collections");
const admin = require("firebase-admin");
require("firebase/storage");

function photoCleaner(documentId, collection, docBefore, docAfter) {
  const bucket = admin.storage().bucket();
  let deletePromises = findPrefixesToDelete(documentId, collection, docBefore, docAfter).map(
    prefix => {
      if (prefix.charAt(0) === "/") prefix = prefix.substr(1);
      return bucket.deleteFiles({ prefix });
    }
  );
  return Promise.all(deletePromises);
}

function findPrefixesToDelete(documentId, collection, docBefore, docAfter) {
  switch (collection) {
    case collections.PLACES: {
      if (!docBefore.photos || !docBefore.photos.length) return [];
      return docBefore.photos
        .filter(
          photo =>
            docAfter &&
            docAfter.photos &&
            docAfter.photos.map(somePhoto => somePhoto.id).indexOf(photo.id) < 0
        )
        .map(photo => {
          photoPath = photo.path;
          if (photoPath.charAt(0) === "/") photoPath = photoPath.substr(1);
          return `${photoPath}/${documentId}-pp-${photo.id}.`;
        });
    }
    case collections.BUNDLES:
    case collections.OUTFITS: {
      let prefixes = [];
      let coverPhotoBefore = (docBefore && docBefore.coverPhoto) || null;
      let coverPhotoAfter = (docAfter && docAfter.coverPhoto) || null;
      let thumbPhotoBefore = (docBefore && docBefore.thumbPhoto) || null;
      let thumbPhotoAfter = (docAfter && docAfter.thumbPhoto) || null;

      if (coverPhotoBefore && (!coverPhotoAfter || coverPhotoBefore.id !== coverPhotoAfter.id)) {
        if (coverPhotoBefore.id)
          prefixes.push(
            `${coverPhotoBefore.path}/${documentId}-${collection.charAt(0)}c-${
              coverPhotoBefore.id
            }.`
          );
        else prefixes.push(`${coverPhotoBefore.path}/${documentId}-${collection.charAt(0)}c.`);
      }

      if (thumbPhotoBefore && (!thumbPhotoAfter || thumbPhotoBefore.id !== thumbPhotoAfter.id)) {
        if (thumbPhotoBefore.id)
          prefixes.push(
            `${thumbPhotoBefore.path}/${documentId}-${collection.charAt(0)}t-${
              thumbPhotoBefore.id
            }.`
          );
        else prefixes.push(`${thumbPhotoBefore.path}/${documentId}-${collection.charAt(0)}t.`);
      }
      return prefixes;
    }
    default: {
      return [];
    }
  }
}

module.exports = photoCleaner;
