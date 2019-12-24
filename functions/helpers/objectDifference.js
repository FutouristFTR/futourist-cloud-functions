module.exports = function objectDifference(object1, object2) {
  let differenceObject = Object.assign({}, object1);
  if (object2 && Object.keys(object2).length && object1 && Object.keys(object1).length){
    Object.keys(object2).forEach(object2key => {
      delete differenceObject[object2key];
    });
    return differenceObject;
  }
  else if (object1 && Object.keys(object1).length) {
    return differenceObject;
  }
  else{
    return {};
  }
}
