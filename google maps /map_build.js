var margin = {top: 20, right: 20, bottom: 20, left:20}	

      function createObjectDict(siArray){
        var objectDictTime = {};
        siArray.forEach(function(item, index){
          if(Array.isArray(objectDictTime[item["ID"]]))
            objectDictTime[item["ID"]].push(item);
          else
            objectDictTime[item["ID"]] = [item];
          })
        return objectDictTime;
      }
  //walk through this logic, check against data structures
     function buildGraph(itemData){
      //console.log(itemData);
      return {"ID": itemData[0]["ID"], "time": itemData[0]["time"], "pm": itemData[0]["pm2.5 (ug/m^3)"]};
     }
     function openWindow(id, infowindow, marker){
        infowindow.open(marker.get('map'), marker);

        $.ajax({
          url: 'http://air.eng.utah.edu:8086/query',
          data: {
            db: 'defaultdb',
            q: "SELECT * FROM airQuality WHERE ID = '" + id  + "' LIMIT 100"
          },
          success: function(resultSensorData){
            resultSensorData = resultSensorData.results[0].series[0];
            console.log(resultSensorData);
            var margin = {
                top: 30,
                right: 20,
                bottom: 30,
                left: 50
            };

            var width = 600 - margin.left - margin.right;
            var height = 270 - margin.top - margin.bottom;

            var x = d3.scaleTime().range([0, width])
            var y = d3.scaleLinear().range([height, 0]);
            // Scale the range of the data
            x.domain(d3.extent(resultSensorData.values, function (d) {
                return new Date(d[resultSensorData.columns.indexOf('time')]);
            }));
            y.domain([0, d3.max(resultSensorData.values, function (d) {
                return d[resultSensorData.columns.indexOf('pm2.5 (ug/m^3)')];
            })]);
            var xAxis = d3.axisBottom(x).ticks(5);
            var yAxis = d3.axisLeft(y).ticks(5);

            var valueline = d3.line()
                .x(function (d) {
                    return x(new Date(d[resultSensorData.columns.indexOf('time')]));
                })
                .y(function (d) {
                    return y(d[resultSensorData.columns.indexOf('pm2.5 (ug/m^3)')]);
                });

            var container = d3.select(".graph-containers") //
                .attr("width", 480)
                .attr("height", 320);

            // adds the svg attributes to container
            var svgContainer = container.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svgContainer.append("path") // Add the valueline path.
                .attr("d", valueline(resultSensorData.values));

            svgContainer.append("g") // Add the X Axis
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            svgContainer.append("g") // Add the Y Axis
                .attr("class", "y axis")
                .call(yAxis);

            svgContainer.append("text")
                  .attr("class", "title")
                  .attr("x", width/2)
                  .attr("y", 0 - (margin.top / 2))
                  .attr("text-anchor", "middle")
                  .attr("font-family", "verdana")
                  .text(infowindow.content);

          }

        });
      }

      function formatData(dictionary){
        var graphie = [];
        for (var element in dictionary){
          graphie.push(buildGraph(dictionary[element]));
        }
        //console.log(graphie);
        return graphie;
      }

      function sortByTime(odWtime){
          for (var itemID in odWtime) {
            if (!odWtime.hasOwnProperty(itemID)) {
              continue;
            }
            odWtime[itemID].sort(function(item1, item2) {
              var date1 = new Date(item1.time);
              var date2 = new Date(item2.time);
              return date1.getTime() - date2.getTime();
            });
          }
          return odWtime;
      }

  	  function initMap(){
  	    var uluru = {lat: 40.7608, lng:-111.8910};
  	    var map = new google.maps.Map(document.getElementById('map'), {
  	      zoom: 8,
  	      center: uluru
  	    });

      	var locations = [];

  	    $.ajax({
  	      url: 'http://air.eng.utah.edu:8086/query',
  	      data: {
  	        db: 'defaultdb',
  	        q: 'SELECT * FROM airQuality WHERE time >= \'2017-02-01\' LIMIT 100'
  	      },

        success: function (response) {
          response = response.results[0].series[0];
          //console.log(response);        
          var sensorInfoArray = [];
          
          for (var k = 0; k < response.values.length; k += 1){
          	var infoObject = {};
          	for (var i = 0; i < response.columns.length; i += 1){
          		infoObject[response.columns[i]] = response.values[k][i];
          	}
            sensorInfoArray.push(infoObject);
          }//closes outer for-loop
          
          var objectDictWTime = createObjectDict(sensorInfoArray);
          sortByTime(objectDictWTime);

          var data = formatData(objectDictWTime);
          //  console.log(data);

          //code for D3 graph

          /*
          * Produces markers for objects created from data, adds listeners for click function
          */
    	sensorInfoArray.forEach(function(item, index){
      		if (item["Latitude"] !== null && item["Longitude"] !== null) {
      			var marker = new google.maps.Marker({
      				position: {lat: parseFloat(item["Latitude"]), lng: parseFloat(item["Longitude"])},
      				map: map
      			});

        		var infowindow = new google.maps.InfoWindow();
              	infowindow.setContent(item['ID']);

         		marker.addListener('click', function(){
                	openWindow(item["ID"], infowindow, marker);
           		});
      	   }
  		 });

  		//console.log(objectDictWTime);
    },

        error: function () {
          console.warn(arguments);
        }
      }); //close ajax
    }