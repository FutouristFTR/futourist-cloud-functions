module.exports = aggregatePlaceLocations;

function aggregatePlaceLocations(placeDocs) {
  let latSum = 0;
  let lngSum = 0;
  let count = 0;

  let latMin = null;
  let latMax = null;
  let lngMin = null;
  let lngMax = null;

  placeDocs.forEach(placeDoc => {
    if (placeDoc.exists) {
      const place = placeDoc.data();
      let latitude = place.lat;
      let longitude = place.lng;

      if (latitude !== undefined && longitude !== undefined) {
        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);

        // calculate the bounding box for the outfit
        if (latMin === null || latitude < latMin) latMin = latitude;
        if (latMax === null || latitude > latMax) latMax = latitude;
        if (lngMin === null || longitude < lngMin) lngMin = longitude;
        if (lngMax === null || longitude > lngMax) lngMax = longitude;

        latSum += latitude;
        lngSum += longitude;
        count++;
      }
    }
  });

  // calculate average latitude and longitude for the outfit
  let nextLat = latSum / count;
  let nextLng = lngSum / count;

  if (count <= 0) {
    // if no places present all outfit coordinates should equal null
    nextLat = null;
    nextLng = null;
  }

  if (lngMin - lngMax > 180) {
    // date line problem - flip bounding box if it's closer to cross the date line, than to go around the world (not crossing the date line)
    let tempLng = lngMin;
    lngMin = lngMax;
    lngMax = tempLng;
  }

  return {
    lat: nextLat,
    lng: nextLng,
    latMin,
    latMax,
    lngMin,
    lngMax,
  };
}
