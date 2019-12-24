const admin = require("firebase-admin");
let serviceAccount = require("../../config/serviceAccountKey.json");
const { tmpdir } = require("os");
const { join, dirname } = require("path");
const sharp = require("sharp");
const fs = require("fs-extra");
require("firebase/storage");

const collections = require("../../constants/collections");
const photoConstants = require("../../constants/photos");

async function imageUploadHandler(object) {
  const filePath = object.name;
  const contentType = object.contentType;
  if (!validatePhotoUpload(filePath, contentType)) {
    return false;
  }
  const bucket = admin.storage().bucket(object.bucket);
  const fileName = filePath.split("/").pop();
  const collection = filePath.split("/")[0];
  const bucketDir = dirname(filePath);
  const documentId = filePath.split("/")[1];
  const workingDir = join(tmpdir(), "resize-" + documentId);
  const tmpFilePath = join(workingDir, "source.jpg");

  await fs.ensureDir(workingDir);
  await bucket.file(filePath).download({
    destination: tmpFilePath,
  });

  const sizes = photoConstants.sizes[collection];
  const fileNameNoExt = fileName
    .split(".")
    .slice(0, -1)
    .join(".");
  const extension = fileName.split(".").pop();

  const uploadPromises = sizes.map(async size => {
    const thumbName = `${fileNameNoExt}-${size.w}x${size.h}.${extension}`;
    const thumbPath = join(workingDir, thumbName);

    await sharp(tmpFilePath)
      .withMetadata()
      .rotate()
      .resize(size.w, size.h)
      .toFile(thumbPath);

    const destination = join(bucketDir, thumbName);

    await bucket.upload(thumbPath, {
      destination,
      contentType,
    });

    return {
      url: `https://firebasestorage.googleapis.com/v0/b/${
        serviceAccount.project_id
      }.appspot.com/o/${encodeURIComponent(destination)}?alt=media&${new Date()
        .getTime()
        .toString(36)}`,
      size,
    };
  });

  const uploadedUrls = await Promise.all(uploadPromises);
  let mediaLinks = {};
  uploadedUrls.forEach(urlData => {
    mediaLinks[`${urlData.size.w}x${urlData.size.h}`] = urlData.url;
  });

  await fs.remove(workingDir);

  let newDocumentData;
  switch (collection) {
    case collections.REVIEWS: {
      newDocumentData = {
        placeId: object.metadata.placeId,
        rating: object.metadata.rating,
        text: object.metadata.text,
        userId: object.metadata.userId,
        type: object.metadata.type,
        mediaId: documentId,
        mediaLinks: mediaLinks,
      };
      break;
    }
    case collections.USERS: {
      newDocumentData = {
        profilePhoto: mediaLinks,
        updated: admin.firestore.FieldValue.serverTimestamp(),
      };
      break;
    }
    default: {
      return console.error("ImageUpload: Unrecognized collection " + collection);
    }
  }

  console.log("saving new document data", newDocumentData);
  firestorePromise = admin
    .firestore()
    .collection(collection)
    .doc(documentId)
    .set(newDocumentData, { merge: true });

  return await firestorePromise.catch(err => {
    console.error(err);
    return false;
  });
}

function validatePhotoUpload(filePath, contentType) {
  const collection = filePath.split("/")[0];
  if ([collections.USERS, collections.REVIEWS].indexOf(collection) < 0) {
    // Cancel if upload not meant for resizing
    return false;
  }
  const fileName = filePath.split("/").pop();
  const photoType = photoConstants.types[collection];

  const resizedImageRegex = new RegExp(
    `^.{1,}-${photoType}-[0-9]{1,}x[0-9]{1,4}\.[A-Za-z]{1,4}$`,
    "g"
  );

  if (resizedImageRegex.test(fileName)) {
    // Cancel if image already resized
    return false;
  }

  const newImageRegex = new RegExp(`^.{1,}-${photoType}\.[A-Za-z]{1,4}$`, "g");
  if (!contentType.includes("image") || !newImageRegex.test(fileName)) {
    // Unexpected: An unknown file uploaded into reviews folder
    console.error(`ImageUpload: An unknown file written in ${filePath} - investigate`);
    return false;
  }
  return true;
}

module.exports = imageUploadHandler;
