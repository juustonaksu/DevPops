import './style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Fill, RegularShape, Stroke, Style} from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import Overlay from 'ol/Overlay';
import Point from 'ol/geom/Point';
import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import CircleStyle from 'ol/style/Circle';

const stroke = new Stroke({color: 'cyan', width: 2});
const fill = new Fill({color: 'white'});

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
      radius: 8,
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

const trainSource = new VectorSource({
  format: new GeoJSON(),
})

const trainLayer = new VectorLayer({
  source: trainSource,
  style: new Style({
    image: new CircleStyle({
      fill: new Fill({color: 'white'}),
      stroke: new Stroke({color: 'lime', width: 2}),
      radius: 10
    }),
  }),
});

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
      opacity: 0.4
    }),
    vectorLayer,
    trackLayer,
    trainLayer
    
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
      if(property =="nimi"|| property =="tyyppi"||property =="lyhenne" ||property == "name")
      text+=`${property}: ${props[property]}`+"<br>";
    }
  });

  content.innerHTML = '<p>Tiedot:</p><code>' + text + '</code>';
  overlay.setPosition(coordinate);
});

function addTrainFeature(object){
 const coordinates = object.location.coordinates;
 const number = object.trainNumber;
 const newcoords = new Point(coordinates).transform('EPSG:4326', map.getView().getProjection())

 const trainFeature = new Feature({
  geometry:newcoords,
  name: number
 })

 trainSource.addFeature(trainFeature);

}

trackLayer.getSource().on('change', function(evt){
  const source = evt.target;
  if (source.getState() === 'ready') {
    map.getView().fit(source.getExtent());
  }
});

//Connect with a random client Id
var client = new Paho.MQTT.Client("rata.digitraffic.fi", 443, "myclientid_" + parseInt(Math.random() * 10000, 10));

//Gets called if the websocket/mqtt connection gets disconnected for any reason
client.onConnectionLost = function(responseObject) {
  //Depending on your scenario you could implement a reconnect logic here
  alert("connection lost: " + responseObject.errorMessage);
};

//Gets called whenever you receive a message for your subscriptions
client.onMessageArrived = function(message) {
  //Do something with the push message you received
  addTrainFeature(JSON.parse(message.payloadString));
};

//Connect Options
var options = {
  useSSL:true,
  timeout: 3,
  //Gets Called if the connection has sucessfully been established
  onSuccess: function() {
    client.subscribe('train-locations/#', {
      qos: 0
    });
  },
  //Gets Called if the connection could not be established
  onFailure: function(message) {
    alert("Connection failed: " + message.errorMessage);
  }
};

client.connect(options);
