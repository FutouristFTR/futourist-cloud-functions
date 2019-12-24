"use strict";
const admin = require("firebase-admin");
admin.initializeApp({}, "authorizedHttpsFunctions");
const express = require("express");
const cookieParser = require("cookie-parser")();
const cors = require("cors")({ origin: true });
const app = express();

const validateFirebaseIdToken = require("../../utils/validateFirebaseIdToken");

app.use(cors);
app.use(cookieParser);
app.use(validateFirebaseIdToken);

app.post("/changeUserData/", (req, res) => {
  const changeUserData = require("./changeUserData");
  return changeUserData(req, res);
});

module.exports.expressApp = app;
