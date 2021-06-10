(function () {

  // map options
  const options = {
    scrollWheelZoom: true,
    zoomSnap: .1,
    center: [39.5, -111],
    zoom: 3,
    dragging: true,
    zoomControl: false
  }

  // create the Leaflet map
  const map = L.map('map', options);
  new L.control.zoom({ position: "topleft" }).addTo(map)

  // request tiles and add to map
  L.tileLayer('http://{s}.tile.stamen.com/toner-background/{z}/{x}/{y}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    ext: 'png'
  }).addTo(map);

  let attributeValue = "IR-WFrTo";

  const labels = {
    "IR-WFrTo": "Total Usage",
    "IC-WFrTo": "Livestock Usage",
    "LS-WFrTo": "Crop Usage"
  }

  // AJAX request for GeoJSON data
  $.getJSON("data/us-counties.json", function (counties) {
    // THE DATA ENDED UP BEING MUCH MORE COMPLICATED TO WORK WITH THAN I EXPECTED, SO I DECIDED TO ONLY USE ONE DATASET FOR THIS PROJECT.;

    Papa.parse('data/2005_data.csv', {

      download: true,
      header: true,
      complete: function (data) {

        processData(counties, data);

      }
    }); // end of Papa.parse()

  })
  //   .fail(function() {
  //   // the data file failed to load
  //   console.log("Ruh roh! An error has occurred." );
  // });//-------------------------------------------------------------------------------------------------------------------------------------

  function processData(counties, data) {

    // loop through all the counties
    for (let county of counties.features) {

      // for each of the CSV data rows
      for (let csv of data.data) {

        // if the county fips code and data fips code match
        if (county.properties.GEOID === csv.FIPS) {

          // re-assign the data for that county as the county's props
          county.properties = csv;

          // no need to keep looping, break from inner loop
          break;
        }
      }
    }
    // empty array to store all the data values
    const rates = [];


    // iterate through all the counties
    counties.features.forEach(function (county) {

      // iterate through all the props of each county
      for (const prop in county.properties) {

        // if the attribute is a number and not one of the fips codes or name
        if (prop != "FIPS" && prop != "State-County Name" && prop != "STATE" && prop != "GEOID") {

          // push that attribute value into the array
          rates.push(Number(county.properties[prop]));
        }
      }
    });

    drawMap(counties);
  }//-------------------------------------------------------------------------------------------------------------------------------------

  function drawMap(counties) {

    // create Leaflet object with geometry data and add to map
    const dataLayer = L.geoJson(counties, {
      style: function (feature) {
        return {
          color: 'black',
          weight: 1,
          fillOpacity: 1,
          fillColor: '#1f78b4'
        };
      },
      // add hover/touch functionality to each feature layer
      onEachFeature: function (feature, layer) {

        // when mousing over a layer
        layer.on('mouseover', function () {
          layer.setStyle({
            color: '#FFFF00'
          }).bringToFront();
        });
        layer.on('mouseout', function () {
          layer.setStyle({
            color: '#20282e'
          });
        });
      }
    }).addTo(map);

    // first set the zoom/center to the dataLayer's extent
    map.fitBounds(dataLayer.getBounds());

    // then back the zoom level off a bit (since we're viewing the map full screen)
    map.setZoom(map.getZoom() - .2);

    updateMap(counties);
    addUI(counties);
  }//-------------------------------------------------------------------------------------------------------------------------------------

  function updateMap(counties) {
    console.log(counties)

    const breaks = getClassBreaks(counties);

    // loop through each county layer to update the color and tooltip info
    counties.eachLayer(function (layer) {

      const props = layer.feature.properties;

      // set the fill color of layer based on its normalized data value
      layer.setStyle({
        fillColor: getColor(props[attributeValue], breaks)
      });

      // assemble string sequence of info for tooltip (end line break with + operator)
      let tooltipInfo = `<b>${props["State-County Name"]}</b></br>
            ${((props[IR-WFrTo])).toLocaleString()} Mgal/d <br>
            ${((props[IC-WFrTo])).toLocaleString()} Mgal/d <br>
            ${((props[LS-WFrTo])).toLocaleString()} Mgal/d`

      // bind a tooltip to layer with county-specific information
      layer.bindTooltip(tooltipInfo, {
        // sticky property so tooltip follows the mouse
        sticky: true
      });

    });

    addLegend(breaks);

  } //---------------------------------------------------------------------------------------------------------

  function getClassBreaks(counties) {

    const values = [];

    counties.eachLayer(function (layer) {
      let value = layer.feature.properties[attributeValue];
      values.push(value); // push the normalized value for each layer into the Array
    });

    const clusters = ss.ckmeans(values, 4);

    // create an array of the lowest value within each cluster
    const breaks = clusters.map(function (cluster) {
      return [cluster[0], cluster.pop()];
    });

    return breaks;
  }

  // Get color of counties
  function getColor(d, breaks) {
    // function accepts a single normalized data attribute value
    // and uses a series of conditional statements to determine 
    // which color value to return to return to the function caller

    if (d <= breaks[0][1]) {
      return '#ebedeb';
    } else if (d <= breaks[1][1]) {
      return '#c7e1f0';
    } else if (d <= breaks[2][1]) {
      return '#4987ab';
    } else if (d <= breaks[3][1]) {
      return '#0b6599'
    }
  }//-------------------------------------------------------------------------------------------------------------------------------------
  function addLegend(breaks) {
    const legendControl = L.control({ position: 'bottomleft' });

    legendControl.onAdd = function () {

      // select a div element with an id attribute of legend
      const legend = L.DomUtil.get('legend');

      // disable scroll and click/touch on map when on legend
      L.DomEvent.disableScrollPropagation(legend);
      L.DomEvent.disableClickPropagation(legend);

      // return the selection to the method
      return legend;

    };

    // add the empty legend div to the map
    legendControl.addTo(map);

    updateLegend(breaks);
  } //----------------------------------------------------------------------------------------------------------------------------

  function updateLegend(breaks) {

    // select the legend, add a title, begin an unordered list and assign to a variable
    const legend = $('#legend').html(`<h5>${labels[attributeValue]}</h5>`);

    // loop through the Array of classification break values
    for (let i = 0; i <= breaks.length - 1; i++) {

      let color = getColor(breaks[i][0], breaks);

      legend.append(
        `<span style="background:${color}"></span>
			<label>${(breaks[i][0]).toLocaleString()} &mdash;
			${(breaks[i][1]).toLocaleString()}</label>`);
    }
  }//-------------------------------------------------------------------------------------------------------------------------------------

  function addUi(counties) {
    // create the slider control
    var selectControl = L.control({ position: "topright" });

    // when control is added
    selectControl.onAdd = function () {
      // get the element with id attribute of ui-controls
      return L.DomUtil.get("dropdown-ui");
    };
    // add the control to the map
    selectControl.addTo(map);

    $('#dropdown-ui select').change(function () {
      attributeValue = this.value;
      updateMap(counties);
    });
  }//-------------------------------------------------------------------------------------------------------------------------------------


})();
