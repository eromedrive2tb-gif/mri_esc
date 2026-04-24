GTA V Map Web Component
A Lit-based web component that renders an interactive GTA V map using Leaflet. Works in vanilla HTML, React, and Angular.

Features
Configurable tile layers (Satellite, Atlas, Grid)
Custom markers with groups and HTML popups
Marker clustering (via leaflet.markercluster)
Polylines and polygons with centered labels
Heatmap layer from marker density
Click-to-place mode
Custom CRS support
CSP-safe (no unsafeCSS)
Full imperative API + declarative attributes
Zero runtime dependencies (everything bundled)
Quick Start

<gta-v-map
  zoom="3"
  default-style="satellite"
  tile-base-url="/mapStyles"
  blips-url="/blips"
  show-layer-control
  markers='[{"x": 0, "y": 0, "icon": 1, "popup": "Hello!"}]'
></gta-v-map>

import 'gta-v-map';

const map = document.querySelector('gta-v-map');
map.addMarker({ x: 100, y: 200, icon: 1, popup: '<b>Dynamic</b>' });
Map Styles
The component supports three built-in tile styles:

Satellite	Atlas	Grid
Satellite	Atlas	Grid
Set the initial style with the default-style attribute:


<gta-v-map default-style="satellite"></gta-v-map>
Sections
Installation
Configuration
API Reference
Framework Guides
Pager
Installation
npm

npm install gta-v-map
The package bundles all dependencies (Leaflet, Lit, markercluster, heatmap) — no peer dependencies required.

Import

import 'gta-v-map';
This registers the <gta-v-map> custom element globally.

Tile Assets
The component does not include map tile images. You need to host them yourself and point to them via the tile-base-url attribute.

Expected folder structure:


/mapStyles/
  styleSatelite/{z}/{x}/{y}.jpg
  styleAtlas/{z}/{x}/{y}.jpg
  styleGrid/{z}/{x}/{y}.png
/blips/
  1.png
  2.png
  ...
TypeScript
Types are included in the package:


import type { GtaVMap, GtaMarker, GtaShape, MapClickDetail } from 'gta-v-map';
React JSX Types
The package includes JSX intrinsic element types. They're automatically available when you import from gta-v-map:


// No extra setup needed
<gta-v-map zoom="3" show-layer-control></gta-v-map>
Pager
Previous page
Overview
Configuration
All configuration is done via HTML attributes or JavaScript properties.

Tile Configuration
Attribute	Type	Default	Description
tile-base-url	string	'mapStyles'	Base path for tile folders
satellite-url	string	—	Override URL template for satellite tiles
atlas-url	string	—	Override URL template for atlas tiles
grid-url	string	—	Override URL template for grid tiles
Style Previews
Satellite	Atlas	Grid
Satellite	Atlas	Grid
Individual tile URLs take priority over tile-base-url. Example:


<!-- Uses base URL for all styles -->
<gta-v-map tile-base-url="/assets/tiles"></gta-v-map>

<!-- Override satellite only, others use base -->
<gta-v-map
  tile-base-url="/assets/tiles"
  satellite-url="https://cdn.example.com/sat/{z}/{x}/{y}.jpg"
></gta-v-map>
Map Configuration
Attribute	Type	Default	Description
default-style	'satellite' | 'atlas' | 'grid'	'satellite'	Initial tile style
zoom	number	3	Initial zoom level
min-zoom	number	1	Minimum zoom level
max-zoom	number	5	Maximum zoom level
max-bounds	[[number,number],[number,number]]	[[-4000,-5500],[8000,6000]]	Pan bounds (GTA V coordinates)
max-bounds-viscosity	number	1	How hard bounds resist panning (0-1)
leaflet-css-url	string	Leaflet CDN	URL for Leaflet CSS
Feature Toggles
Attribute	Type	Default	Description
show-layer-control	boolean	false	Show tile/layer switcher
show-heatmap	boolean	false	Show heatmap layer
disable-clustering	boolean	false	Disable marker clustering
place-mode	boolean	false	Enable click-to-place mode
Icon Configuration
Attribute	Type	Default	Description
blips-url	string	'blips'	Base path for marker icon images
Icons are loaded as {blips-url}/{icon-number}.png.

Custom CRS
The CRS can only be set via JavaScript (not an attribute). It's read once at initialization.


import L from 'leaflet';

const map = document.querySelector('gta-v-map');
map.crs = L.CRS.EPSG3857; // or any custom CRS
Default: GTA V custom CRS (included in the package as createGtaCRS()).

CSS Custom Properties
Property	Default	Description
--gta-water-color	#1a3a4a	Background color for empty/ocean areas

gta-v-map {
  --gta-water-color: #0a2a3a;
}
Pager
Previous page
Installation
Properties & Attributes
Declarative Data
markers
An array of markers to render on the map.

Type: GtaMarker[]


interface GtaMarker {
  x: number;
  y: number;
  icon: number;
  popup?: string;     // plain text or HTML
  id?: string;        // optional, for upsert
  group?: string;     // layer group name, default "Markers"
}
HTML (JSON string):


<gta-v-map markers='[
  {"x": 0, "y": 0, "icon": 1, "popup": "<b>Hello</b>", "group": "Spawns"},
  {"x": 500, "y": 500, "icon": 2, "popup": "Shop", "group": "Shops"}
]'></gta-v-map>
JavaScript (array):


const map = document.querySelector('gta-v-map');
map.markers = [
  { x: 0, y: 0, icon: 1, popup: '<b>Hello</b>', group: 'Spawns' },
];
shapes
An array of polylines/polygons to render on the map.

Type: GtaShape[]


interface GtaShape {
  type: 'polyline' | 'polygon';
  points: [number, number][];
  color?: string;          // default '#3388ff'
  weight?: number;         // default 3
  opacity?: number;        // default 1
  fillColor?: string;      // default same as color
  fillOpacity?: number;    // default 0.2
  popup?: string;          // HTML popup on click
  group?: string;          // layer group, default "Shapes"
  id?: string;             // optional, for upsert
  label?: {
    text: string;
    className?: string;
    fontSize?: number;     // default 12
    color?: string;        // default '#fff'
  };
}
Example:


<gta-v-map shapes='[
  {
    "type": "polygon",
    "points": [[-200,-400],[300,-400],[300,100],[-200,100]],
    "color": "#ff4444",
    "fillOpacity": 0.15,
    "group": "Zones",
    "label": {"text": "Danger Zone", "color": "#ff4444"}
  },
  {
    "type": "polyline",
    "points": [[0,0],[500,500],[1000,200]],
    "color": "#44ff44",
    "weight": 4,
    "group": "Routes"
  }
]'></gta-v-map>
Pager
Previous page
Configuration
Methods
All methods are called on the <gta-v-map> element instance.

Marker Methods
addMarker(marker)
Add a new marker or update an existing one (upsert). If marker.id is provided and already exists, the marker is updated in place.

Parameters: GtaMarker — { x, y, icon, popup?, id?, group? }

Returns: string — the marker id


Vanilla

React

Angular

const map = document.querySelector('gta-v-map');

// Create new marker (auto-generated id)
const id = map.addMarker({
  x: 100, y: 200,
  icon: 1,
  popup: '<b>New marker</b>',
  group: 'Points of Interest',
});

// Upsert — update if id exists, create if not
map.addMarker({
  id: 'hq',
  x: 300, y: 400,
  icon: 2,
  popup: '<b>HQ</b><br>Moves each call',
});
removeMarker(id)
Remove a marker by its id.

Parameters: string — marker id

Returns: boolean — true if found and removed


Vanilla

React

Angular

const removed = map.removeMarker('hq');
console.log(removed); // true or false
getMarkers()
Returns all current markers (both declarative and imperative).

Returns: ReadonlyArray<{ id, x, y, icon, popup?, group }> — markers without internal Leaflet refs


Vanilla

React

Angular

const markers = map.getMarkers();
console.log(`${markers.length} markers on the map`);
markers.forEach(m => console.log(m.id, m.x, m.y));
clearMarkers()
Remove all markers from the map.


Vanilla

React

Angular

map.clearMarkers();
Shape Methods
addShape(shape)
Add a polyline or polygon. If shape.id is provided and already exists, the shape is replaced.

Parameters: GtaShape — { type, points, color?, weight?, opacity?, fillColor?, fillOpacity?, popup?, group?, id?, label? }

Returns: string — the shape id


Vanilla

React

Angular

// Polygon
const zoneId = map.addShape({
  type: 'polygon',
  points: [[-200, -400], [300, -400], [300, 100], [-200, 100]],
  color: '#ff4444',
  fillOpacity: 0.15,
  popup: '<b>Danger Zone</b>',
  group: 'Zones',
  label: { text: 'Danger Zone', color: '#ff4444', fontSize: 14 },
});

// Polyline
const routeId = map.addShape({
  type: 'polyline',
  points: [[0, 0], [500, 500], [1000, 200]],
  color: '#44ff44',
  weight: 4,
  group: 'Routes',
  label: { text: 'Route A', color: '#44ff44' },
});
removeShape(id)
Remove a shape by its id.

Parameters: string — shape id

Returns: boolean — true if found and removed


Vanilla

React

Angular

map.removeShape(zoneId);
getShapes()
Returns all current shapes.

Returns: ReadonlyArray<{ id, type, points, color, weight, ... }>


Vanilla

React

Angular

const shapes = map.getShapes();
clearShapes()
Remove all shapes from the map.


Vanilla

React

Angular

map.clearShapes();
Pager
Previous page
Properties
Events
All events are CustomEvents with bubbles: true and composed: true, so they cross Shadow DOM boundaries.

map-ready
Fired when the Leaflet map is initialized and ready.

Detail: { map: L.Map }


Vanilla

React

Angular

map.addEventListener('map-ready', (e) => {
  console.log('Map initialized:', e.detail.map);
});
map-click
Fired when the user clicks on the map.

Detail: { x: number, y: number } — GTA V coordinates


Vanilla

React

Angular

map.addEventListener('map-click', (e) => {
  console.log(`Clicked at x=${e.detail.x}, y=${e.detail.y}`);
});
marker-click
Fired when the user clicks on a marker.

Detail: { id: string, x: number, y: number, icon: number, popup?: string }


Vanilla

React

Angular

map.addEventListener('marker-click', (e) => {
  const { id, x, y } = e.detail;
  console.log(`Marker ${id} clicked at ${x}, ${y}`);
});
marker-placed
Fired when the user clicks on the map while place-mode is enabled. Use this to create a marker at the clicked location.

Detail: { x: number, y: number } — GTA V coordinates


Vanilla

React

Angular

map.setAttribute('place-mode', '');

map.addEventListener('marker-placed', (e) => {
  const { x, y } = e.detail;
  map.addMarker({
    x, y,
    icon: 1,
    popup: `<b>Placed</b><br>x: ${x.toFixed(1)}, y: ${y.toFixed(1)}`,
  });
});
Pager
Previous page
Methods
Vanilla HTML
The simplest integration — just import the component and use it in HTML.

Basic Setup

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GTA V Map</title>
  <style>
    body { margin: 0; }
    gta-v-map { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <gta-v-map
    zoom="3"
    default-style="satellite"
    tile-base-url="/mapStyles"
    blips-url="/blips"
    show-layer-control
    markers='[{"x": 0, "y": 0, "icon": 1, "popup": "<b>Spawn</b>", "group": "Spawns"}]'
  ></gta-v-map>

  <script type="module">
    import 'gta-v-map';
  </script>
</body>
</html>
Accessing the Element

const map = document.querySelector('gta-v-map');

// Wait for ready
map.addEventListener('map-ready', () => {
  console.log('Map is ready!');
});

// Add markers imperatively
map.addMarker({
  x: 100, y: 200,
  icon: 1,
  popup: '<b>Dynamic marker</b>',
  group: 'Dynamic',
});
Full Example with All Features

<gta-v-map
  id="map"
  zoom="3"
  default-style="satellite"
  tile-base-url="/mapStyles"
  blips-url="/blips"
  show-layer-control
  markers='[
    {"x": 0, "y": 0, "icon": 1, "popup": "<b>Spawn</b>", "group": "Spawns"},
    {"x": 500, "y": 500, "icon": 1, "popup": "<b>Safe House</b>", "group": "Properties"}
  ]'
  shapes='[
    {
      "type": "polygon",
      "points": [[-200,-400],[300,-400],[300,100],[-200,100]],
      "color": "#ff4444",
      "fillOpacity": 0.15,
      "group": "Zones",
      "label": {"text": "Danger Zone", "color": "#ff4444"}
    }
  ]'
></gta-v-map>

<script type="module">
  import 'gta-v-map';

  const map = document.getElementById('map');

  // Listen to events
  map.addEventListener('map-click', (e) => {
    console.log('Clicked:', e.detail.x, e.detail.y);
  });

  map.addEventListener('marker-click', (e) => {
    console.log('Marker:', e.detail.id);
  });

  // Toggle heatmap
  map.showHeatmap = true;

  // Enable place mode
  map.placeMode = true;
  map.addEventListener('marker-placed', (e) => {
    map.addMarker({
      ...e.detail,
      icon: 1,
      popup: `Placed at ${e.detail.x.toFixed(0)}, ${e.detail.y.toFixed(0)}`,
    });
  });
</script>
Custom CRS

import { createGtaCRS } from 'gta-v-map';
import L from 'leaflet';

const map = document.querySelector('gta-v-map');

// Use a different CRS before the map initializes
map.crs = L.CRS.Simple;

// Or create a custom one
// map.crs = createGtaCRS(); // this is the default
Styling

/* Change water/background color */
gta-v-map {
  --gta-water-color: #0a2a3a;
  display: block;
  width: 100%;
  height: 600px;
}
Pager
Previous page
Events
