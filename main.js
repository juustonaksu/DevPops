import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Text, Fill, RegularShape, Stroke, Style } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import Overlay from 'ol/Overlay';
import Point from 'ol/geom/Point';
import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import CircleStyle from 'ol/style/Circle';
import { toFunction } from 'ol/style/Style';
import {fromLonLat} from 'ol/proj';

const stroke = new Stroke({ color: 'cyan', width: 2 });
const fill = new Fill({ color: 'white' });

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


function locationStyleFunction(feature) {
    return new Style({
        image: new CircleStyle({
            fill: new Fill({ color: '#54555c' }),
            stroke: new Stroke({ color: 'red', width: 5 }),
            radius: 7
        }),
        text: new Text({
            text: feature.get('name').toString(),
            offsetY: 18,
            font:'12px Verdana',
            fill: new Fill({
                color: "#000000"
            }),
            stroke: new Stroke({
                color: "#ffffff",
                width: 3
            }),
        })
    })
}

const locationSource = new VectorSource({
    format: new GeoJSON()
})

const locationLayer = new VectorLayer({
    source: locationSource,
    style: locationStyleFunction
});

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

function trainStyleFunction(feature) {
    return new Style({
        image: new CircleStyle({
            fill: new Fill({ color: 'white' }),
            stroke: new Stroke({ color: '#25b33f', width: 3 }),
            radius: 16
        }),
        text: new Text({
            text: feature.get('name').toString(),
            fill: new Fill({
                color: "#25b33f"
            }),
            stroke: new Stroke({
                color: "#ffffff",
                width: 4
            }),
        })
    })
}

const trainSource = new VectorSource({
    format: new GeoJSON(),
})

const trainLayer = new VectorLayer({
    source: trainSource,
    style: trainStyleFunction
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
        trainLayer,
        locationLayer

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
    var text = "";
    map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        const props = feature.getProperties();
        for (const property in props) {
            if (property == "nimi" || property == "tyyppi" || property == "lyhenne" || property == "name" || property == "speed") {
                text += `${property}: ${props[property]}` + "<br>";
            }
        }
    });

    content.innerHTML = '<p>Tiedot:</p><code>' + text + '</code>';
    overlay.setPosition(coordinate);
});

function determineUpdate(object) {
    const coordinates = object.location.coordinates;
    const number = object.trainNumber;
    const speed = object.speed;
    const newpoint = new Point(coordinates).transform('EPSG:4326', map.getView().getProjection())
    let found = false;
    const trainFeatures = trainSource.getFeatures();
    if (trainFeatures.length > 0) {
        for (const tf of trainFeatures) {
            if (number === tf.get('name')) {
                //match has been found, change coordinates
                found = true;
                updateTrainFeature(tf, newpoint, speed)
            }
        }
    }
    if (!found) {
        addTrainFeature(newpoint, number, speed);
    }
}

function updateTrainFeature(feature, point, speed) {
    feature.setGeometry(point);
    feature.set('speed', speed);
}

function addTrainFeature(point, number, speed) {

    const trainFeature = new Feature({
        geometry: point,
        name: number,
        speed: speed
    });
    trainSource.addFeature(trainFeature);
}

trackLayer.getSource().on('change', function (evt) {
    const source = evt.target;
    if (source.getState() === 'ready') {
        map.getView().fit(source.getExtent());
    }
});

//Connect with a random client Id
var client = new Paho.MQTT.Client("rata.digitraffic.fi", 443, "myclientid_" + parseInt(Math.random() * 10000, 10));

//Gets called if the websocket/mqtt connection gets disconnected for any reason
client.onConnectionLost = function (responseObject) {
    //Depending on your scenario you could implement a reconnect logic here
    alert("connection lost: " + responseObject.errorMessage);
};

//Gets called whenever you receive a message for your subscriptions
client.onMessageArrived = function (message) {
    //Do something with the push message you received
    determineUpdate(JSON.parse(message.payloadString));
};

//Connect Options
var options = {
    useSSL: true,
    timeout: 3,
    //Gets Called if the connection has sucessfully been established
    onSuccess: function () {
        client.subscribe('train-locations/#', {
            qos: 0
        });
    },
    //Gets Called if the connection could not be established
    onFailure: function (message) {
        alert("Connection failed: " + message.errorMessage);
    }
};

client.connect(options);

function success(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const mapview = map.getView();
    const locationpoint = fromLonLat([longitude,latitude]);
    mapview.animate(
        {
          center: locationpoint,
          zoom: 14,
          duration: 2000,
        }
      );
    const locationFeature = new Feature({
        geometry: new Point(locationpoint),
        name: "Sinä"
    });
    locationSource.addFeature(locationFeature);

}

function error() {
    console.log('Unable to retrieve your location');
}

if (!navigator.geolocation) {
    console.log('Geolocation is not supported by your browser');
} else {
    console.log('Locating…');
    navigator.geolocation.getCurrentPosition(success, error);
}