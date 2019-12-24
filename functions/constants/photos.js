const collections = require("./collections");

const sizes = {
  [collections.REVIEWS]: [
    { w: 50, h: 50 },
    { w: 100, h: 100 },
    { w: 310, h: 550 },
    { w: 405, h: 720 },
    { w: 608, h: 1080 },
    { w: 1080, h: 1920 },
  ],
  [collections.USERS]: [{ w: 50, h: 50 }, { w: 100, h: 100 }, { w: 500, h: 500 }],
};

const types = {
  [collections.USERS]: "up",
  [collections.REVIEWS]: "rp",
};

module.exports = { sizes, types };
