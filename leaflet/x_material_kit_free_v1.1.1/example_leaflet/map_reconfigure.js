// initialize the map to hover over slc
var x = d3.scaleTime().domain([new Date ("2017-09-06T00:00:00Z"), new Date ("2017-09-07T00:00:00Z")]);
var lineColor = d3.scaleOrdinal(d3.schemeCategory10);
var y = d3.scaleLinear().domain([0.0, 120.0]);
var map = L.map('map').setView([40.7608, -111.8910], 13);
var margin = {
  top: 20,
  right: 30,
  bottom: 30,
  left: 40
};

var width = 700 - margin.left - margin.right;
var height = 150 - margin.top - margin.bottom;
// load a tile layer
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic2tpdHJlZSIsImEiOiJjajUyb2l0YzQwaHJwMnFwMTNhdGwxMGx1In0.V5OuKXRdmwjq4Lk3o8me1A', {
  maxZoom: 18,
  id: 'mapbox.streets',
  accessToken: 'pk.eyJ1Ijoic2tpdHJlZSIsImEiOiJjajUydDkwZjUwaHp1MzJxZHhkYnl3eTd4In0.TdQB-1U_ID-37stKON_osw'
}).addTo(map);

var timelineBounds;
var lineArray = [];
window.onload = window.onresize = function () {
  timelineBounds = d3.select('.timeline').node().getBoundingClientRect();// makes sure svg is alwasy same size as div
  setUp();
  // TODO: call the render function(s)
  //  L.imageOverlay('overlay1.png', [[40.795925, -111.998256], [40.693031, -111.827190]], {
  // 		opacity: 0.5,
  // 		interactive: true,
  // 	}).addTo(map);
}

function distance(lat1, lon1, lat2, lon2) {
  var p = 0.017453292519943295;    // Math.PI / 180
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 +
  c(lat1 * p) * c(lat2 * p) *
  (1 - c((lon2 - lon1) * p))/2;

  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

function findDistance(r, mark){
  var lt = mark.getLatLng().lat;
  var lng = mark.getLatLng().lng;
  var closestsensor = null;
  var sensorobject = null;

  r.forEach(function (item){
    if (item["Latitude"] !== null && item["Longitude"] !== null) {
      var d = distance(lt, lng, parseFloat(item["Latitude"]), parseFloat(item["Longitude"]));
      //compare old distance to new distance. Smaller = closestsensor
      if (closestsensor === null) {
        closestsensor = d; //distance
        sensorobject = item; //data object
      } else {
        if (closestsensor > d) {
          closestsensor = d;
          sensorobject = item;
        }
      }
    }
    //console.log(closestsensor);
  });
  //console.log(sensorobject, closestsensor);
  return sensorobject;
}


function findCorners(ltlg){
  var cornerarray = [];
  lt = ltlg.lat;
  lg = ltlg.lng;

  var lt1 = lt - 5.0;
  cornerarray.push(lt1);
  var lt2 = lt + 5.0;
  cornerarray.push(lt2);
  var lg1 = lg - 5.0;
  cornerarray.push(lg1);
  var lg2 = lg + 5.0;
  cornerarray.push(lg2);

  return cornerarray;
  //console.log(cornerarray);
}

function findNearestSensor(cornerarray, mark, callback){
  //console.log("SELECT * FROM airQuality WHERE Latitude >'" + cornerarray[0] + "' AND Latitude <'" + cornerarray[1] + "' AND Longitude >'"+ cornerarray[2] +"' AND Longitude < '"+ cornerarray[3] + "' LIMIT 100");

  $.ajax({
    url: 'https://air.eng.utah.edu:8086/query',
    data: {
      db: 'defaultdb',
      q: "SELECT MEAN(\"pm2.5 (ug/m^3)\") from airQuality where time >='2017-09-06T00:00:00Z' group by ID, Latitude, Longitude limit 100"
    },
    success: function (response){
      //console.log(response);
      response = response.results[0].series.map(function (d) {
        return d.tags; //pulls out tag to clean up data for distance finding
      });
      //console.log(response);

      //closest needs to be sensor info, not distance to closest sensor
      var closest = findDistance(response, mark); //returns closest sensor using distance equation
      callback(closest);
    },
    error: function () {
      console.warn(arguments);
    }
  });//closes ajax
}//closes findNearestSensor


function addData (sensorData){
  sensorData = sensorData.results[0].series[0];
  var chartLabel = sensorData.values[0][sensorData.columns.indexOf('ID')];
  var markrname = sensorData.values[0][sensorData.columns.indexOf('ID')]; //what shows up in the marker on click (name of sensor)
  var timeColumn = sensorData.columns.indexOf('time');
  var pm25Column = sensorData.columns.indexOf('pm2.5 (ug/m^3)');

  sensorData = sensorData.values.map(function (d) {
    return {
      time: new Date(d[timeColumn]),
      pm25: d[pm25Column]
    };
  }).filter(function (d) {
    return d.pm25 === 0 || !!d.pm25;  // forces NaN, null, undefined to be false, all other values to be true
  });

  lineArray.push({
    id: markrname,
    sensorData: sensorData
  }); //pushes data for this specific line to an array so that there can be multiple lines updated dynamically on Click
  //console.log(sensorData);
  drawChart();
}

function drawChart (){
  var svg = d3.select("div svg"); // TODO: this isn't specific enough...

  // Scale the range of the data

  var valueline = d3.line()
  .x(function (d) {
    return x(d.time);
  })
  .y(function (d) {
    return y(d.pm25);
  })

  // adds the svg attributes to container
  let lines = svg.select('#lines').selectAll('path').data(lineArray, function (d) {
    return d.id;
  }); //any path in svg is selected then assigns the data from the array
  lines.exit().remove(); //remove any paths that have been removed from the array that no longer associated data
  let linesEnter = lines.enter().append("path"); // looks at data not associated with path and then pairs it
  lines = linesEnter.merge(lines); //combines new path/data pairs with previous, unremoved data

  lines.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
  .attr("d", d => { return valueline(d.sensorData); })
  .attr("class", "line-style")
  .attr("stroke", d => lineColor(d.id)); //no return for d function, see above for example (163)

  svg.select("#legend").selectAll("text").data(lineArray, d => d.id)
  // adds the svg attributes to container
  let labels = svg.select("#legend").selectAll("text").data(lineArray, d => d.id); //any path in svg is selected then assigns the data from the array
  labels.exit().remove(); //remove any paths that have been removed from the array that no longer associated data
  let labelEnter = labels.enter().append("text"); // looks at data not associated with path and then pairs it
  labels = labelEnter.merge(labels); //combines new path/data pairs with previous, unremoved data

  //set up the legend later
  // labels.attr("x", margin.left + width/2)
  // .attr("y", margin.top)
  // .attr("text-decoration")
  // .attr("text-anchor", "middle")
  // .attr("font-family", "verdana")
  // .text(d => d.id);


}




function makeGraph(mark){
  findNearestSensor(findCorners(mark.getLatLng()), mark, function (sensor) {
    mark = mark.bindPopup('<p>'+ sensor["ID"] +'</p>').openPopup();
    var range = getDateTime();
    console.log(sensor);
    $.ajax({
      url: 'https://air.eng.utah.edu:8086/query',
      data: {
        db: 'defaultdb',
        //q:"SELECT * FROM airQuality WHERE ID = '" "' LIMIT 100"
        q: "SELECT * FROM airQuality WHERE ID = '"+ sensor["ID"]+ "' AND time >= '2017-09-06T00:00:00Z'AND time <= '2017-09-07T00:00:00Z'"
      }, //SELECT "pm2.5 (ug/m^3)" FROM "airQuality" WHERE "ID"='' and time >= '2017-09-06T00:00:00Z' and time < '2017-09-07T00:00:00Z'
      success: addData,
      error: function () {
        console.warn(arguments);
      }
    });
  });
}

var markr = null;

function onMapClick(e) {
  markr = new L.marker(e.latlng)
  .addTo(map)

  makeGraph(markr);
}

function setUp(){
  var div = d3.select(".timeline");
  var svg = div.select("svg") //sets size of svgContainer

  x.range([0, width]);
  y.range([height, 0]);

  svg.attr("width", timelineBounds.width)
  .attr("height", timelineBounds.height);

  svg.append("rect") //sets svg rect in container
  .style("stroke", "black")
  .style("fill", "none")
  .attr("width", 700)
  .attr("height", 150);

  var xAxis = d3.axisBottom(x).ticks(9);
  var yAxis = d3.axisLeft(y).ticks(7);

  svg.append("g") // Add the X Axis
  .attr("class", "x axis")
  .attr("transform", "translate(" + margin.left + "," + (margin.top + height) + ")")
  .call(xAxis);

  svg.append("g") // Add the Y Axis
  .attr("class", "y axis")
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
  .call(yAxis);

}

function getDateTime(){
  var today = new Date().toISOString().substr(0, 19) +"Z";
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate()-1);
  yesterday = yesterday.toISOString().substr(0, 19) +"Z";
  //console.log(today, yesterday);

  var twodays = "2017-09-03T22:58:27Z"
  return [yesterday, twodays];
}

map.on('click', onMapClick);


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
      results.push({
        lat: lat[latIndex],
        lon: lon[lonIndex],
        pmVal: Number(value)
      });
    });
  });

  //console.log(results);

  // var idw = L.idwLayer(results,{
  //       opacity: 0.3,
  //       maxZoom: 18,
  //       cellSize: 10,
  //       exp: 3,
  //       max: 15.0
  //   }).addTo(map);


  /*
  for (var i = 0; i < lat.length; i ++){ //get lat because values change down column, not row
  lvArray.push([dictionaryShite(lat[i]), dictionaryShite(lon[0])]); //pmVal[latitude][longitude]
}
console.log(lvArray);
*/
});



function getData(strng){
  return new Promise(function (resolve, reject) { //use a promise as a place holder until a promise is fulfilled (resolve)
    d3.text(strng, function(data){
      // console.log(strng, data)
      resolve(data);
    });
  });
}

// document.getElementById("sensorSwitch").addEventListener("click", function(){
//   $.ajax({
//     url: 'https://air.eng.utah.edu:8086/query',
//     data: {
//       db: 'defaultdb',
//       q: "SELECT MEAN(\"pm2.5 (ug/m^3)\") from airQuality where time >='2017-09-06T00:00:00Z'"
//     },
//     success: function (response){
//       console.log(response);
//
//     }});
//   }
  // markr = new L.marker(e.latlng)
  // .addTo(map)

  // if (item["Latitude"] !== null && item["Longitude"] !== null) {
  //   var marker = new google.maps.Marker({
  //     position: {lat: parseFloat(item["Latitude"]), lng: parseFloat(item["Longitude"])},
  //     map: map
  //   });
