const collections = require("../../constants/collections");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const axios = require("axios");
require("firebase/storage");

module.exports = function reviewCleaner(reviewId, review) {
  if (review.type && review.type === "image") {
    const bucket = admin.storage().bucket();
    return bucket
      .deleteFiles({ prefix: collections.REVIEWS + "/" + reviewId })
      .then(() => console.log("Review photos successfully deleted (reviews/" + reviewId + ")"))
      .catch(err => console.error(err));
  } else if (review.type && review.type === "video") {
    const credentials = Buffer.from(
      functions.config().mux.token_id + ":" + functions.config().mux.token_secret
    ).toString("base64");
    return axios({
      method: "delete",
      url: "https://api.mux.com/video/v1/assets/" + review.assetId,
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    })
      .then(() => console.log("Video successfully deleted from MUX."))
      .catch(err => {
        console.error(err);
      });
  }
};
