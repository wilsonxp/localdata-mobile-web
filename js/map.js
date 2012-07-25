NSB.MapView = function(mapContainerId){
    
  var map, marker, circle;
  var markers = {};
  var doneMarkersLayer = new L.LayerGroup();
  var pointMarkersLayer = new L.LayerGroup();

  var selectedPolygon = null;
  var selectedCentroid = null;
  var selectedObjectJSON = null;
  
  this.init = function() {
    console.log("Initialize map");
    map = new L.Map(mapContainerId, {minZoom:13, maxZoom:18});

    // Add the layer of done markers; will be populated later
    map.addLayer(doneMarkersLayer);

    // Add a bing layer to the map
    bing = new L.BingLayer(NSB.settings.bing_key, 'AerialWithLabels', {maxZoom:21});
    map.addLayer(bing);
    
    // Listen for events
    $.subscribe("successfulSubmit", getResponsesInMap);

    // Add the maps from TileMill. 
    wax.tilejson(NSB.settings.maps[NSB.settings.locale]['json'], function(tilejson) {
      map.addLayer(new wax.leaf.connector(tilejson));

      // Highlight parcels when clicked
      // Trigger form updates
      map.on('click', function(e) {
        console.log("Map clicked");
        
        NSB.API.getObjectDataAtPoint(e.latlng, function(data){
          selectedObjectJSON = data;
          selectedCentroid = new L.LatLng(selectedObjectJSON.centroid.coordinates[1], selectedObjectJSON.centroid.coordinates[0]);      
          
          highlightObject(data);
          NSB.selectedObject = {};
          NSB.selectedObject.id = data.parcelId;
          NSB.selectedObject.humanReadableName = data.address;
          
          $.publish("objectSelected");
        });
      });

      // MoveEnd handler
      // Show which parcels have responses when the map is moved.
      map.on('moveend', function(e) {
        try {
          getResponsesInMap();
        } catch(e){}
      });

      // Location handlers
      // Used for centering the map when we're using geolocation.
      map.on('locationfound', onLocationFound);
      map.on('locationerror', onLocationError);

      // Center the map 
      map.locate({setView: true, maxZoom: 18});

      // Mark a location on the map. 
      // Primarily used with browser-based geolocation (aka "where am I?")
      function onLocationFound(e) {
        // Add the accuracy circle to the map
      	var radius = e.accuracy / 2;
      	circle = new L.Circle(e.latlng, radius);
      	map.addLayer(circle);

      	getResponsesInMap();
      }

      function onLocationError(e) {
      	alert(e.message);
      }
    });
    
    // Map tools =============================================================
    // Handle searching for addresses
    $("#address-search-toggle").click(function(){
      console.log("Toggling address search");
      $("#address-search").slideToggle();
      $("#address-search-prompt").slideToggle();
    });
    
    $("#address-submit").click(function(){
      goToAddress($("#address-input").val());
    });
    
    $("#geolocate").click(function(){
       map.locate({setView: true, maxZoom: 18});
    });
        
  }; // end init
  
  
  // Map information for consumers ===========================================
  // Get the selected centroid.
  // Pretty simple! 
  this.getSelectedCentroid = function() {
    return selectedCentroid;
  };
  
  // Return the bounds of the map as a string
  this.getMapBounds = function() {
    bounds = "";
    bounds += map.getBounds().getNorthWest().toString();
    bounds += " " + map.getBounds().getSouthEast().toString();  
    return bounds;
  };
  

  // Icons ===================================================================
  var CheckIcon = L.Icon.extend({
    options: {
      className: 'CheckIcon',
      iconUrl: 'img/icons/check-16.png',
      shadowUrl: 'img/icons/check-16.png',
    	iconSize: new L.Point(16, 16),
    	shadowSize: new L.Point(16, 16),
    	iconAnchor: new L.Point(8, 8),
    	popupAnchor: new L.Point(8, 8)
    }
  });  
  
  
  // Move the map ============================================================
  // Attempt to center the map on an address using Google's geocoder.
  // This should probably live in APIs. 
  var goToAddress = function(address) {
    console.log("Coding an address");
    NSB.API.codeAddress(address, function(latlng){
      var marker = new L.Marker(latlng);
      map.addLayer(marker);
      map.setView(latlng, 18);
    });
  };
    
    
  // Handle selecting objects ===============================================
  // Outline the given polygon
  // expects polygon to be {coordinates: [[x,y], [x,y], ...] }
  var highlightObject = function(selectedObjectJSON) {
    polygonJSON = selectedObjectJSON.polygon;

    // Remove existing highlighting 
    if(selectedPolygon) {
      map.removeLayer(selectedPolygon);
    };

    // Add the new polygon
    var polypoints = new Array();  
    for (var i = polygonJSON.coordinates[0].length - 1; i >= 0; i--){
      point = new L.LatLng(polygonJSON.coordinates[0][i][1], polygonJSON.coordinates[0][i][0]);
      polypoints.push(point);
    };
    options = {
        color: 'red',
        fillColor: 'transparent',
        fillOpacity: 0.5
    };
    selectedPolygon = new L.Polygon(polypoints, options);
    map.addLayer(selectedPolygon);
  };
  
  // Adds a checkbox marker to the given point
  var addDoneMarker = function(latlng, id) {
    // Only add markers if they aren't already on the map.
    if (markers[id] == undefined){
      var doneIcon = new CheckIcon();
      doneMarker = new L.Marker(latlng, {icon: doneIcon});
      doneMarkersLayer.addLayer(doneMarker);
      markers[id] = doneMarker;
    };
  };
  
  // Get all the responses in a map 
  var getResponsesInMap = function(){  
    console.log("Getting responses in the map");
    
    // Don't add any markers if the zoom is really far out. 
    zoom = map.getZoom();
    if(zoom < 17) {
      return;
    }

    // Get the objects in the bounds
    // And add them to the map   
    NSB.API.getObjectsInBounds(map.getBounds(), function(results) {
      $.each(results, function(key, elt) {
        p = new L.LatLng(elt.geo_info.centroid[0],elt.geo_info.centroid[1]);
        id = elt.parcel_id;
        addDoneMarker(p, id);
      });
    });

  };
  
  // Map init ================================================================
  this.init();
};