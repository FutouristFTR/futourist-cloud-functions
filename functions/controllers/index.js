// HTTPS TRIGGERS
const authorizedFunctions = require("./controllers/authorizedFunctions");
const publicFunctions = require("./controllers/publicFunctions");
const emailFunctions = require("./controllers/emailFunctions");

// FIRESTORE TRIGGERS
const writeHandler = require("./controllers/writeHandler/");
const reviewHandler = require("./controllers/reviewHandler/");
const placeHandler = require("./controllers/placeHandler/");
const bundleHandler = require("./controllers/bundleHandler/");

module.exports = {
  // https trigers
  authorizedFunctions,
  publicFunctions,
  emailFunctions,

  // firestore trigers
  writeHandler,
  reviewHandler,
  placeHandler,
  bundleHandler,
};
