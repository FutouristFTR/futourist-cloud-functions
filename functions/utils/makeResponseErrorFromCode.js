const errors = require("../constants/errors");
module.exports = function(code) {
  if (code && errors[code]) {
    let error = {};
    error.message = errors[code];
    error.code = code;
    return error;
  } else {
    let error = {};
    error.code = "futourist/unknown_error";
    error.message = errors["futourist/unknown_error"];
    return error;
  }
};
