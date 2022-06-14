import './style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Fill, RegularShape, Stroke, Style} from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';

import Overlay from 'ol/Overlay';

const stroke = new Stroke({color: 'black', width: 2});
const fill = new Fill({color: 'red'});

/**
 * Elements that make up the popup.
 */
 const container = document.getElementById('popup');
 const content = document.getElementById('popup-content');
 const closer = document.getElementById('popup-closer');
 
 /**
  * Create an overlay to anchor the popup to the map.
  */
 const overlay = new Overlay({
   element: container,
   autoPan: {
     animation: {
       duration: 250,
     },
   },
 });
 
 /**
  * Add a click handler to hide the popup.
  * @return {boolean} Don't follow the href.
  */
 closer.onclick = function () {
   overlay.setPosition(undefined);
   closer.blur();
   return false;
 };


const vectorLayer = new VectorLayer({
  source: new VectorSource({
    url: 'https://rata.digitraffic.fi/infra-api/latest/rautatieliikennepaikat.geojson?srsName=crs:84',
    format: new GeoJSON(),
  }),
  style: new Style({
    image: new RegularShape({
      fill: fill,
      stroke: stroke,
      points: 4,
      radius: 10,
      angle: Math.PI / 4,
    }),
  }),
});

const trackSource = new VectorSource({
  url: 'raiteet.geojson',
  format: new GeoJSON(),
})

const trackLayer = new VectorLayer({
  source: trackSource
});

const map = new Map({
  target: 'map',
  layers: [
    vectorLayer,
    trackLayer,
    new TileLayer({
      source: new OSM(),
      opacity: 0.4
    })
  ],
  overlays: [overlay],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});


/**
 * Add a click handler to the map to render the popup.
 */
 map.on('singleclick', function (evt) {
  const coordinate = evt.coordinate;
  var text="";
  map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    const props = feature.getProperties();
    for (const property in props) {
      if(property =="nimi"|| property =="tyyppi"||property =="lyhenne")
      text+=`${property}: ${props[property]}`+"<br>";
    }
    console.log(feature.getGeometry())
    console.log(map.getView().getProjection())
  });

  content.innerHTML = '<p>Tiedot:</p><code>' + text + '</code>';
  overlay.setPosition(coordinate);
});

