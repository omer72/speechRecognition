import React, { Component } from 'react';
import L from 'leaflet';
// postCSS import of Leaflet's CSS
import 'leaflet/dist/leaflet.css';
// using webpack json loader we can import our geojson file like this
// import geojson from 'json!./convertcsv.geojson';
// import local components Filter and ForkMe
import Filter from './Filter';
import _ from 'underscore';
import pos from 'pos';
import chunker from 'pos-chunker';
import greenIconUrl from './images/tower_directional.png';
import redIconUrl from './images/tower_directional_red_state.png';

// store the map configuration properties in an object,
// we could also move this to a separate file & import it if desired.
let config = {};
config.params = {
  center: [40.655769,-73.938503],
  zoomControl: true,
  scrollwheel: true,
  attributionControl: true
};
config.tileLayer = {
  uri: 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?access_token={accessToken}',
  params: {
    // minZoom: 11,
    attribution: 'CSF Map Search',
    id: '',
    accessToken: 'pk.eyJ1Ijoib21lcjcyIiwiYSI6ImNqYjJrdGZ0NDJhczEyd28xdG41MHZzb2oifQ.A9VVdGr9LxvXej7FDhsmPA'
  }
};

// array to store unique names of Brooklyn subway lines,
// this eventually gets passed down to the Filter component
let towerNames = [];
var LeafIcon = L.Icon.extend({
    options: {
        iconUrl: greenIconUrl,
        iconSize:     [44, 44],
        // shadowSize:   [50, 64],
        // iconAnchor:   [10, 24],
        // shadowAnchor: [4, 62],
        popupAnchor:  [1, -5]
    }
});
var greenIcon = new LeafIcon({iconUrl: greenIconUrl}),
    redIcon = new LeafIcon({iconUrl: redIconUrl});
let srv;
class Map extends Component {
  constructor(props) {
    super(props);
    srv= this;
    srv.state = {
      map: null,
      tileLayer: null,
      geojsonLayer: null,
      geojson: null,
      subwayLinesFilter: '*',
      numEntrances: null,
      filterTextValue: '',
      filteredTowers:[]
    };

    srv._mapNode = null;
    srv.updateMap = srv.updateMap.bind(this);
    srv.onEachFeature = srv.onEachFeature.bind(this);
    srv.pointToLayer = srv.pointToLayer.bind(this);
    srv.filterFeatures = srv.filterFeatures.bind(this);
    srv.filterGeoJSONLayer = srv.filterGeoJSONLayer.bind(this);
  }

    getMapData(){
        var requestURL = 'http://localhost:4000';
        var request = new XMLHttpRequest();
        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();
        request.onload = function() {
            srv.getData( request.response);
            // create the Leaflet map object

        }
    }

  componentDidMount() {
    // code to run just after the component "mounts" / DOM elements are created
    // we could make an AJAX request for the GeoJSON data here if it wasn't stored locally
    srv.getMapData();
    // create the Leaflet map object
    if (!srv.state.map) srv.init(srv._mapNode);
  }

  componentDidUpdate(prevProps, prevState) {
    // code to run when the component receives new props or state
    // check to see if geojson is stored, map is created, and geojson overlay needs to be added
    if (srv.state.geojson && srv.state.map && !srv.state.geojsonLayer) {
      // add the geojson overlay
      srv.addGeoJSONLayer(srv.state.geojson);
    }

    if (srv.state.subwayLinesFilter !== prevState.subwayLinesFilter) {
      srv.setState({filterTextValue : ""});
      // filter / re-render the geojson overlay
      srv.filterGeoJSONLayer();
    }

    if (srv.state.filterTextValue !== prevState.filterTextValue){
      srv.filterGeoJSONLayer();
    }
  }

  componentWillUnmount() {
    // code to run just before unmounting the component
    // this destroys the Leaflet map object & related event listeners
    srv.state.map.remove();
  }

  getData(geojson) {
      this.geojson = geojson;
    // could also be an AJAX request that results in setting state with the geojson data
    // for simplicity sake we are just importing the geojson data using webpack's json loader
    srv.setState({
      numEntrances: geojson.features.length, geojson
    });
    srv.setState({filterByStatus: srv.getFilterValuesArray(geojson.features,'Status')});
    srv.setState({filterByCity: srv.getFilterValuesArray(geojson.features,'City')});
  }


  getFilterValuesArray(features,type){
    let valuesOfType = [];
    _.each(features, function (feature) {
      if (_.indexOf(valuesOfType,feature.properties[type]) ===-1 ){
        valuesOfType.push(feature.properties[type]);
      }
    });
    return valuesOfType;
  }

  updateMap(e) {
    let subwayLine = e.target.value;
    // change the subway line filter
    if (subwayLine === "All lines") {
      subwayLine = "*";
    }
    // update our state with the new filter value
    srv.setState({
      subwayLinesFilter: subwayLine
    });
  }

  addGeoJSONLayer(geojson) {
    // create a native Leaflet GeoJSON SVG Layer to add as an interactive overlay to the map
    // an options object is passed to define functions for customizing the layer
    const geojsonLayer = L.geoJson(geojson, {
      onEachFeature: srv.onEachFeature,
      pointToLayer: srv.pointToLayer,
      filter: srv.filterFeatures
    });
    // add our GeoJSON layer to the Leaflet map object
    geojsonLayer.addTo(srv.state.map);
    // store the Leaflet GeoJSON layer in our component state for use later
    srv.setState({ geojsonLayer });
    // fit the geographic extent of the GeoJSON layer within the map's bounds / viewport
    srv.zoomToFeature(geojsonLayer);
  }

  filterGeoJSONLayer() {
    // clear the geojson layer of its data
    srv.state.geojsonLayer.clearLayers();
    // re-add the geojson so that it filters out subway lines which do not match state.filter
    srv.state.geojsonLayer.addData(srv.geojson);
    srv.setState({filteredTowers:srv.state.geojsonLayer._layers });
    if (srv.state.geojsonLayer._layers && _.values(srv.state.geojsonLayer._layers).length == 1){
        let icon = _.values(srv.state.geojsonLayer._layers)[0];
        icon.fireEvent('click');
    }
    // fit the map to the new geojson layer's geographic extent
    srv.zoomToFeature(srv.state.geojsonLayer);
  }

  zoomToFeature(target) {
    // pad fitBounds() so features aren't hidden under the Filter UI element
    var fitBoundsParams = {
      paddingTopLeft: [200,10],
      paddingBottomRight: [10,10]
    };
    // set the map's center & zoom so that it fits the geographic extent of the layer
    srv.state.map.fitBounds(target.getBounds(), fitBoundsParams);
  }

  filterBy(text,featureValue,validValues) {
    let isValid = "";
      if (text.toLowerCase().indexOf(featureValue.toLowerCase()) !==-1) {
        isValid = true;
      }
    return isValid;
  }

  isTheTextHasValidValue(text,validValues){
    let valueExist = false;
    _.each(validValues,function(value) {
      if (valueExist ||  text.toLowerCase().indexOf (value.toLowerCase()) !==-1) {
        valueExist = true;
      }
    });
    return valueExist;
  }

  filterFeatures(feature, layer) {
    // returns true only if the filter value matches the value
    let isFilters = false;
    let isCityNameValid = false;
    let isCityNameExist = false;
    let isStatusValid = "";
    let isStatusExist = false;
    let filterText = srv.state.filterTextValue;
    if (filterText !== ""){
      // console.log('filter by text: ',filterText);
      if (filterText === 'show me all') {
        isFilters = true;
      }else {
          isCityNameValid = srv.filterBy(filterText, feature.properties.City, srv.state.filterByCity);
          isStatusValid = srv.filterBy(filterText, feature.properties.Status, srv.state.filterByStatus);
          isCityNameExist = srv.isTheTextHasValidValue(filterText, srv.state.filterByCity);
          isStatusExist = srv.isTheTextHasValidValue(filterText, srv.state.filterByStatus);


          if (isCityNameValid && isStatusValid) {
              isFilters = true;
          } else if (isCityNameValid) {
              if (isStatusExist && !isStatusValid) {
                  isFilters = false;
              } else {
                  isFilters = true;
              }
          } else if (isStatusValid) {
              if (isCityNameExist) {
                  isFilters = false;
              } else {
                  isFilters = true;
              }
          }

          // console.log('isCityNameValid isCityNameValid=',isCityNameValid , ' isCityNameExist=',isCityNameExist,' isStatusValid=', isStatusValid,' isStatusExist=', isStatusExist);
          filterText = filterText.toLowerCase();
          if (isCityNameValid) filterText = filterText.replace(feature.properties.City.toLowerCase(),'');
          if (isStatusValid) filterText = filterText.replace(feature.properties.Status.toLowerCase(),'');

          let words = new pos.Lexer().lex(filterText);
          let tags = new pos.Tagger()
              .tag(words)
              .map(function (tag) {
                  return tag[0] + '/' + tag[1];
              })
              .join(' ');
          var places = chunker.chunk(tags, '[{ tag: NNP }]');
          var numbers = chunker.chunk(tags, '[{ tag: CD }]');
          var adjective = chunker.chunk(tags, '[{ tag: JJ }]');
          var noun = chunker.chunk(tags, '[{ tag: NN }]');
          // console.log('tags-> ',tags, ' places-> ',places, ' numbers ->',numbers);

          let found = [],          // an array to collect the strings that are found
              rxp = /{([^}]+)}/g,
              curMatch;
          while (curMatch = rxp.exec(places)) {
              curMatch[1] = curMatch[1].replace('/NNP', '');
              curMatch[1] = this.replaceWords(curMatch[1]);
              found.push(curMatch[1]);
          }

          while (curMatch = rxp.exec(numbers)) {
              curMatch[1] = curMatch[1].replace('/CD', '');
              found.push(curMatch[1]);
          }

          while (curMatch = rxp.exec(noun)) {
              curMatch[1] = curMatch[1].replace('/NN', '');
              curMatch[1] = this.replaceWords(curMatch[1]);
              found.push(curMatch[1]);
          }


          if (isCityNameValid && found.length > 0) {
              isFilters = false;
              let filterByText = true;
              // console.log('found -> ', found);
              _.each(found, function (value) {
                  if (filterByText && (feature.properties.Address.toLowerCase().indexOf(value.toLowerCase()) !== -1 ||
                          feature.properties.Company.toLowerCase().indexOf(value.toLowerCase()) !== -1 ||
                          feature.properties.City.toLowerCase().indexOf(value.toLowerCase()) !== -1)) {
                      // console.log('');
                  } else {
                      filterByText = false;
                  }
              });

              if (isStatusExist && isStatusValid && filterByText) {
                  isFilters = true;
              } else if (isStatusExist && isStatusValid === '') {
                  isFilters = false;
              } else
                  isFilters = filterByText;
          }
      }

    }else {
      console.log('filter by dropdown');
      const test = (feature.properties.Address+' '+ feature.properties.City) === (srv.state.subwayLinesFilter);
      if (srv.state.subwayLinesFilter === 'All Towers' || srv.state.subwayLinesFilter === '*' || test) {
        isFilters =  true;
      }
    }
    return isFilters;
  }


  replaceWords(value){
      switch (value.toLowerCase().trim()) {
          case 'avenue':
              value = 'ave';
              break;
          case 'parkway':
              value = 'pkwy';
              break;
          case 'drive':
              value = 'dr';
              break;
          case 'street':
              value = 'st.';
              break;
          case 'fifth':
              value = '5th';
              break;
          case 'Boulevard':
              value = 'blvd';
              break;
      }
      return value;
  }


  pointToLayer(feature, latlng) {
    if (feature.properties.Status === 'Active'){
      return L.marker(latlng, {icon: greenIcon});
    }else{
        return L.marker(latlng, {icon: redIcon});
    }
  }

  onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.Company && feature.properties.Status) {

      // if the array for unique subway line names has not been made, create it
      // there are 19 unique names total
      if (towerNames.length < 3) {

        // add subway line name if it doesn't yet exist in the array
        // feature.properties.LINE.split('-').forEach(function(line, index){
        //   if (towerNames.indexOf(line) === -1) towerNames.push(line);
        // });
        if (towerNames.indexOf(feature.properties.Status) === -1) towerNames.push(feature.properties.Status);

        // on the last GeoJSON feature
        if (srv.state.geojson.features.indexOf(feature) === srv.state.numEntrances - 1) {
          // use sort() to put our values in alphanumeric order
          towerNames.sort();
          // finally add a value to represent all of the subway lines
          towerNames.unshift('All Towers');
        }
      }

      // assemble the HTML for the markers' popups (Leaflet's bindPopup method doesn't accept React JSX)
      const popupContent = `<h3>${feature.properties.Company}</h3>
        <strong>Tower Address: </strong>${feature.properties.Address} ,${feature.properties.City}</br>
        <strong>Tower status: </strong>${feature.properties.Status}`;

      // add our popups
      layer.bindPopup(popupContent);

    }
  }


  init(id) {
    if (srv.state.map) return;
    // this function creates the Leaflet map object and is called after the Map component mounts
    let map = L.map(id, config.params);
    L.control.zoom({ position: "bottomleft"}).addTo(map);
    L.control.scale({ position: "bottomleft"}).addTo(map);

    // a TileLayer is used as the "basemap"
    const tileLayer = L.tileLayer(config.tileLayer.uri, config.tileLayer.params).addTo(map);

    // set our state to include the tile layer
    srv.setState({ map, tileLayer });
  }
  // Get the text from the filter component
  filterSpeechCallBack = (dataFromChild) =>{
    srv.setState({filterTextValue:dataFromChild});
  }

  render() {
    const { subwayLinesFilter,filterTextValue } = srv.state;
    return (
      <div id="mapUI">
        {
          /* render the Filter component only after the subwayLines array has been created */
          towerNames.length &&
            <Filter lines={towerNames}
              curFilter={subwayLinesFilter}
              filterLines={srv.updateMap}
              filterText={srv.filterSpeechCallBack}
              filteredTowers={srv.state.filteredTowers}/>
        }
        <div ref={(node) => srv._mapNode = node} id="map" />
      </div>
    );
  }
}

export default Map;
