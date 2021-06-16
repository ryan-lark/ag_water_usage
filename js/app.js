(function () {
  const options = {
    scrollWheelZoom: true,
    zoomSnap: .1,
    center: [50, -100], 
    zoom: 3.5,
    dragging: true,
    zoomControl: false
  }

  // create the Leaflet map
  const map = L.map('map', options);
  new L.control.zoom({ position: "topleft" }).addTo(map)

  // request tiles and add to map
  const tiles = L.tileLayer('http://{s}.tile.stamen.com/toner-background/{z}/{x}/{y}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    ext: 'png'
  }).addTo(map);

  // AJAX request for GeoJSON data
  $.getJSON("data/us-counties.json", function (counties) {

    Papa.parse('data/masterData.csv', {

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
        if (prop != "FIPS" && prop != "COUNTY" && prop != "STATE" && prop != "GEOID") {

          // push that attribute value into the array
          rates.push(Number(county.properties[prop]));
        }
      }
    });

    // create class breaks
    var breaks = chroma.limits(rates, 'q', 6);

    // create color generator function
    var colorize = chroma.scale(['#ffffcc','#c7e9b4','#7fcdbb','#41b6c4','#2c7fb8','#253494']).classes(breaks).mode('lab');

    drawMap(counties, colorize);
    drawLegend(breaks, colorize);
  }//-------------------------------------------------------------------------------------------------------------------------------------

  function drawMap(counties, colorize) {

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

    updateMap(dataLayer, colorize, '2010');
    createSliderUI(dataLayer, colorize);
  }//-------------------------------------------------------------------------------------------------------------------------------------


  function updateMap(dataLayer, colorize, usage) {

    dataLayer.eachLayer(function (layer) {

      const props = layer.feature.properties;

      if (props[usage] != '') {

      layer.setStyle({
        fillColor: colorize(Number(props[usage]))
      });

      var tooltip = `<b>${props['COUNTY']}</b><br>
            ${props[usage]} Mgal/d`;

    } else {
      var tooltip = `Water Usage Unkown`;
      
      layer.setStyle({
        fillColor: '#eee'
      });
    }      
    layer.bindTooltip(tooltip, {
        sticky: true
      })
    })


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

    const legend = $('.legend').html("<h3><span>2005</span> Irrigation Usage (Mgal/d)</h3><ul>");

    // loop through the break values
    for (let i = 0; i < breaks.length - 1; i++) {

      // determine color value 
      const color = colorize(breaks[i], breaks);

      // create legend item
      const classRange = `<li><span style="background:${color}"></span>
            ${breaks[i].toLocaleString()} &mdash;
            ${breaks[i + 1].toLocaleString()}</li>`

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
        const usage = this.value; // update the year
        $('.legend h3 span').html(usage); // update the map with current timestamp
        updateMap(dataLayer, colorize, usage); // update timestamp in legend heading
      });
  }//-------------------------------------------------------------------------------------------------------------------------------------


})();
