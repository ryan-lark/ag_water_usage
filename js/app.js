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

  // request tiles and add to map
  const tiles = L.tileLayer('http://{s}.tile.stamen.com/toner-background/{z}/{x}/{y}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    ext: 'png'
  }).addTo(map);

  // AJAX request for GeoJSON data
  $.getJSON("data/us-counties.json", function (counties) {

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
        if (prop != "COUNTY_FIP" && prop != "STATE_FIP" && prop != "NAME" && prop != "GEOID") {

          // push that attribute value into the array
          rates.push(Number(county.properties[prop]));
        }
      }
    });

    // // create class breaks
    // var breaks = chroma.limits(rates, 'q', 5);

    // // create color generator function
    // var colorize = chroma.scale(chroma.brewer.OrRd).classes(breaks).mode('lab');

    drawMap(counties);
    // drawLegend(breaks, colorize);
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
    // createSliderUI(dataLayer);
  }//-------------------------------------------------------------------------------------------------------------------------------------
  function getClassBreaks(counties) {

    // create empty Array for storing values
    const values = [];

    // loop through all the counties
    counties.eachLayer(function (layer) {
      let value = layer.feature.properties[attributeValue];
      values.push(value); // push the normalized value for each layer into the Array
    });

    // determine similar clusters
    const clusters = ss.ckmeans(values, 4);

    // create an array of the lowest value within each cluster
    const breaks = clusters.map(function (cluster) {
      return [cluster[0], cluster.pop()];
    });

    //return array of arrays, e.g., [[0.24,0.25], [0.26, 0.37], etc]
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
      return '#d1e8d1';
    } else if (d <= breaks[2][1]) {
      return '#76db76';
    } else if (d <= breaks[3][1]) {
      return '#117d11'
    }
  }
  //-------------------------------------------------------------------------------------------------------------------------------------

  function updateMap(counties) {

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
            ${((props[attributeValue])).toLocaleString()} Mgal/d`

      // bind a tooltip to layer with county-specific information
      layer.bindTooltip(tooltipInfo, {
        // sticky property so tooltip follows the mouse
        sticky: true
      });

    });


  }//-------------------------------------------------------------------------------------------------------------------------------------

  function drawLegend(breaks, colorize) {
    // create a Leaflet control for the legend
    const legendControl = L.control({
      position: 'topright'
    });

    // when the control is added to the map
    legendControl.onAdd = function (map) {

      // create a new division element with class of 'legend' and return
      const legend = L.DomUtil.create('div', 'legend');
      return legend;

    };

    // add the legend control to the map
    legendControl.addTo(map);

    const legend = $('.legend').html("<h3><span>2001</span> Unemployment Rates</h3><ul>");

    // loop through the break values
    for (let i = 0; i < breaks.length - 1; i++) {

      // determine color value 
      const color = colorize(breaks[i], breaks);

      // create legend item
      const classRange = `<li><span style="background:${color}"></span>
              ${breaks[i].toLocaleString()}% &mdash;
              ${breaks[i + 1].toLocaleString()}% </li>`

      // append to legend unordered list item
      $('.legend ul').append(classRange);
    }
    // close legend unordered list
    legend.append("</ul>");
  }//-------------------------------------------------------------------------------------------------------------------------------------

  function createSliderUI(dataLayer, colorize) {
    const sliderControl = L.control({ position: 'bottomleft' });

    // when added to the map
    sliderControl.onAdd = function (map) {

      // select an existing DOM element with an id of "ui-controls"
      const slider = L.DomUtil.get("ui-controls");

      // disable scrolling of map while using controls
      L.DomEvent.disableScrollPropagation(slider);

      // disable click events while using controls
      L.DomEvent.disableClickPropagation(slider);

      // return the slider from the onAdd method
      return slider;
    }

    // add the control to the map
    sliderControl.addTo(map);

    // select the form element
    $(".year-slider")
      .on("input change", function () { // when user changes
        const currentYear = this.value; // update the year
        $('.legend h3 span').html(currentYear); // update the map with current timestamp
        updateMap(dataLayer, colorize, currentYear); // update timestamp in legend heading
      });
  }//-------------------------------------------------------------------------------------------------------------------------------------


})();
