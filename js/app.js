(function () {

  // select the HTML element that will hold our map
  const mapContainer = d3.select('#map')

  // determine width and height of map from container
  const width = mapContainer.node().offsetWidth - 60;
  const height = mapContainer.node().offsetHeight - 60;

  // create and append a new SVG element to the map div
  const svg = mapContainer
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .classed('position-absolute', true) // add bootstrap class
    .style('top', 40) // 40 pixels from the top
    .style('left', 30); // 40 pixels from the left


  // request the JSON text file, then call drawMap function
  // d3.json("data/states.geojson").then(drawMap);
  // request our data files and reference with variables
  const stateGeoJson = d3.json('data/states.geojson')
  const countyTopoJson = d3.json('data/counties.topojson')

  // wait until data is loaded then send to draw map function
  Promise.all([stateGeoJson, countyTopoJson]).then(drawMap).catch(error => {
    console.log(error)
  });;

  $.getJSON("data/cb_2018_us_county.json", function (counties) {

    Papa.parse('data/2005_data.csv', {
      download: true,
      header: true,
      complete: function (data) {

        processData(counties, data);

      }
    }); // end of Papa.parse()

  });  // end of $.getJSON()


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

      console.log(counties);
      // empty array to store all the data values
      // const rates = [];


      // iterate through all the counties
      // counties.features.forEach(function (county) {

      //   // iterate through all the props of each county
      //   for (const prop in county.properties) {

      //     // if the attribute is a number and not one of the fips codes or name
      //     if (prop != "COUNTY_FIP" && prop != "STATE_FIP" && prop != "NAME" && prop != "GEOID") {

      //       // push that attribute value into the array
      //       rates.push(Number(county.properties[prop]));
      //     }
      //   }
      // });

      // create class breaks
      // var breaks = chroma.limits(rates, 'q', 5);

      // // create color generator function
      // var colorize = chroma.scale(chroma.brewer.OrRd).classes(breaks).mode('lab');

      // drawMap(counties, colorize);
      // drawLegend(breaks, colorize);
}


  //-----------------------------------------------------------------------------------------------------------------------------------------
  // accepts the data as a parameter countiesData
  function drawMap(data) {

    // refer to different datasets
    const stateData = data[0];
    const countiesData = data[1];

    // declare a geographic path generator
    // fit the extent to the width and height using the geojson
    const projection = d3.geoAlbersUsa()
      .fitSize([width, height], stateData);

    // declare a path generator using the projection
    const path = d3.geoPath()
      .projection(projection);

    // Create  div for the tooltip and hide with opacity
    const tooltip = d3.select('.container-fluid').append('div')
      .attr('class', 'my-tooltip bg-warning text-white py-1 px-2 rounded position-absolute invisible');

    // when mouse moves over the mapContainer
    mapContainer
      .on('mousemove', event => {
        // update the position of the tooltip
        console.log(event)
        tooltip.style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 30) + 'px');
      });

    // convert the TopoJSON into GeoJSON
    const countiesGeoJson = topojson.feature(countiesData, {
      type: 'GeometryCollection',
      geometries: countiesData.objects.counties.geometries
    });

    // append a new g element
    const counties = svg.append('g')
      .selectAll('path')
      .data(countiesGeoJson.features) // use the GeoJSON features
      .join('path')  // join them to path elements
      .attr('d', path)  // use our path generator to project them on the screen
      .attr('class', 'county') // give each path element a class name of county

    // applies event listeners to our polygons for user interaction
    counties.on('mouseover', (event, d) => { // when mousing over an element
      d3.select(event.currentTarget).classed('hover', true).raise(); // select it, add a class name, and bring to front
      tooltip.classed('invisible', false).html(`${d.properties.NAME} County`) // make tooltip visible and update info 
    })
      .on('mouseout', (event, d) => { // when mousing out of an element
        d3.select(event.currentTarget).classed('hover', false) // remove the class from the polygon
        tooltip.classed('invisible', true) // hide the element 
      });

    // append states to the SVG
    svg.append('g')
      .selectAll('path')
      .data(stateData.features) // update here
      .join('path')
      .attr('d', path)
      .attr('class', 'state')

  } // end of drawMap function

})();
