module.exports = mergePlacesCategories;

function mergePlacesCategories(placeDocs) {
  let allOutfitCategories = {};
  placeDocs.forEach(placeDoc => {
    if (placeDoc.exists) {
      const place = placeDoc.data();
      if (place.categories) {
        allOutfitCategories = { ...allOutfitCategories, ...place.categories };
      }
    }
  });
  return allOutfitCategories;
}
