module.exports = function(array1, array2) {
  if (!Array.isArray(array1) || array1.length <= 0) {
    return [];
  }

  if (!Array.isArray(array2) || array2.length <= 0) {
    return array1;
  }

  return array1.filter(element => {
    return array2.indexOf(element) < 0;
  });
};
