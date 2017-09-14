lonPromise = getData("/data/XGPS1.csv");
latPromise = getData("/data/XGPS2.csv");
pmValPromise = getData("/data/YPRED.csv");

lvArray = []; //locations + values array
Promise.all([lonPromise, latPromise, pmValPromise]) //Promise.all waits for all the other promises to finish
.then(function (promiseResults) { //once they are finished, the .THEN tells it the next step (a function)
  var lon = promiseResults[0].split('\n');
  lon = lon[0].split(',').map(value => Number(value));
  var lat = promiseResults[1].split('\n');
  lat = lat.map(row => Number(row.split(',')[0]));
  var pmVal = promiseResults[2].split('\n');
  var results = [];

  if (pmVal.length !== lat.length) {
    throw new Error('wrong number of lat coordinates');
  }

  pmVal.forEach((row, latIndex) => {
    row = row.split(',');
    if (row.length <= 1) {
      return;
    }
    if (row.length !== lon.length) {
      throw new Error('wrong number of lon coordinates');
    }
    row.forEach((value, lonIndex) => {
      // latVal = Object.values(results).indexOf(lat[latIndex]);
      // if (> -1)
      results.push({
        lat: lat[latIndex],
        lon: lon[lonIndex],
        pmVal: Number(value)
      });
    });
  });

  console.log(results);

  // var idw = L.idwLayer(results,{
  //       opacity: 0.3,
  //       maxZoom: 18,
  //       cellSize: 10,
  //       exp: 3,
  //       max: 140.0
  //   }).addTo(map);


  /*
  for (var i = 0; i < lat.length; i ++){ //get lat because values change down column, not row
    lvArray.push([dictionaryShite(lat[i]), dictionaryShite(lon[0])]); //pmVal[latitude][longitude]
  }
  console.log(lvArray);
  */
});


function dictionaryShite(dictionary){
  for (var key in dictionary) {
    if (dictionary.hasOwnProperty(key))
    return dictionary[key];
  }
}

function getData(strng){
  return new Promise(function (resolve, reject) { //use a promise as a place holder until a promise is fulfilled (resolve)
    d3.text(strng, function(data){
      // console.log(strng, data)
      resolve(data);
    });
  });
}
