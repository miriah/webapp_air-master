// initialize the map to hover over slc
var map = L.map('map').setView([40.7608, -111.8910], 13);
// load a tile layer
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic2tpdHJlZSIsImEiOiJjajUyb2l0YzQwaHJwMnFwMTNhdGwxMGx1In0.V5OuKXRdmwjq4Lk3o8me1A', {
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
  maxZoom: 18,
  id: 'mapbox.streets',
  accessToken: 'pk.eyJ1Ijoic2tpdHJlZSIsImEiOiJjajUydDkwZjUwaHp1MzJxZHhkYnl3eTd4In0.TdQB-1U_ID-37stKON_osw'
}).addTo(map);

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
    console.log(closestsensor);
  });
  console.log(sensorobject, closestsensor);
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
  console.log(cornerarray);
}

function findNearestSensor(cornerarray, mark, callback){
  //console.log("SELECT * FROM airQuality WHERE Latitude >'" + cornerarray[0] + "' AND Latitude <'" + cornerarray[1] + "' AND Longitude >'"+ cornerarray[2] +"' AND Longitude < '"+ cornerarray[3] + "' LIMIT 100");

  $.ajax({
    url: 'http://air.eng.utah.edu:8086/query',
    data: {
      db: 'defaultdb',
      q: "SELECT MEAN(\"pm2.5 (ug/m^3)\") from airQuality group by ID, Latitude, Longitude limit 100"
    },
    success: function (response){
      console.log(response);
      response = response.results[0].series.map(function (d) {
        return d.tags; //pulls out tag to clean up data for distance finding
      });
      console.log(response);

      //closest needs to be sensor info, not distance to closest sensor
      var closest = findDistance(response, mark); //returns closest sensor using distance equation
      callback(closest);
    },
    error: function () {
      console.warn(arguments);
    }
  });//closes ajax
}//closes findNearestSensor

function drawChart (sensorData){
  sensorData = sensorData.results[0].series[0];

  var chartLabel = sensorData.values[0][sensorData.columns.indexOf('ID')];
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

  if (sensorData.length === 0) {
    chartLabel += ' (no data)';
  }

  console.log(sensorData);
  var svg = d3.select("div svg"); // TODO: this isn't specific enough...
  svg.append("rect") //sets svg rect in container
  .style("stroke", "black")
  .style("fill", "white")
  .attr("width", 200)
  .attr("height", 200);

  var margin = {
    top: 10,
    right: 10,
    bottom: 20,
    left: 20
  };

  var width = 200 - margin.left - margin.right;
  var height = 200 - margin.top - margin.bottom;

  var x = d3.scaleTime().range([0, width])
  var y = d3.scaleLinear().range([height, 0]);
  // Scale the range of the data
  x.domain(d3.extent(sensorData, function (d) {
    return d.time;
  }));
  y.domain([0, d3.max(sensorData, function (d) {
    return d.pm25;
  })]);
  var xAxis = d3.axisBottom(x).ticks(5);
  var yAxis = d3.axisLeft(y).ticks(5);

  var valueline = d3.line()
  .x(function (d) {
    return x(d.time);
  })
  .y(function (d) {
    return y(d.pm25);
  });
    // adds the svg attributes to container
  svg.append("path") // Add the valueline path.
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .attr("d", valueline(sensorData));

  svg.append("g") // Add the X Axis
    .attr("class", "x axis")
    .attr("transform", "translate(" + margin.left + "," + (margin.top + height) + ")")
    .call(xAxis);

  svg.append("g") // Add the Y Axis
    .attr("class", "y axis")
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .call(yAxis);

  svg.append("text")
    .attr("class", "title")
    .attr("x", margin.left + width/2)
    .attr("y", margin.top)
    .attr("text-anchor", "middle")
    .attr("font-family", "verdana")
    .text(chartLabel);

}

function makeGraph(mark){
  findNearestSensor(findCorners(mark.getLatLng()), mark, function (sensor) {
    console.log(sensor);
    $.ajax({
      url: 'http://air.eng.utah.edu:8086/query',
      data: {
        db: 'defaultdb',
        q: "SELECT * FROM airQuality WHERE ID = '" + sensor["ID"]  + "' LIMIT 100"
      },
      success: drawChart,
      error: function () {
        console.warn(arguments);
      }
    });
  });
}

var markr = null;

function onMapClick(e) {
  //create div for graphs
  var div = $('<div style="width: 200px; height: 200px;"><svg><svg/></div>')[0];
  markr = new L.marker(e.latlng)
  .addTo(map)
  .bindPopup(div).openPopup(); //binds div for graphs to popup of marker

  var svg = d3.select("div svg") //sets size of svgContainer
  .attr("width", 200)
  .attr("height", 200);

  makeGraph(markr);
} //end of onMapClick function

map.on('click', onMapClick);
