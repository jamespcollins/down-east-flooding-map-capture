// --- TOOL PARAMETERS ---
var MARKER_DIAMETER_METERS = 250; // Circle marker radius

var REPEAT_MODE = false; // Whether to keep drawing feature drawing on after finishing a feature

// Prompt config
// - prompt (str): Text to display. Can accept HTML tags. If singlePlace: true, can use {{place}} variable to insert individual place name in prompt.
// - onlyFlooding (bool): Only display features with a checked "flooding" checkbox.
// - singlePlace (bool): Iterate through features individually. Recommended to use {{place}} variable in prompt.
// - featureTypes (str array): Which feature geometries to show in prompt. Currently supports ['circle','polyline']. Names should match Leaflet.Draw geometry names.
var PROMPTS = {
    1: {
        prompt: "At which of these places have you seen flooding?",
        onlyFlooding: false,
        singlePlace: false,
        featureTypes: ['circle']
    },
    2: {
        prompt: "Which of these places are most affected by flooding?",
        onlyFlooding: true,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    },
    3: {
        prompt: "How often does it flood at these places?",
        onlyFlooding: true,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    },
    4: {
        prompt: "How does flooding at these places disrupt your day-to-day life, if at all?",
        onlyFlooding: true,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    },
    5: {
        prompt: "How do you deal with flooding at these places?",
        onlyFlooding: true,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    },
    // 6: {
    //     prompt: `<br><h3>If <div class="alert-info p-2 d-inline-block rounded border border-info">{{place}}</div> were flooding enough for you</h3><h3>to use <div class="alert-info p-2 d-inline-block rounded border border-info">{{place}}</div> differently than you do now...</h3>`+
    //      `<h1>How deep would the water be? <br />Where would the water be? <br />How often would it be flooding?</h1>`,
    //     onlyFlooding: false,
    //     singlePlace: true,
    //     featureTypes: ['circle']
    // },
    // 7: {
    //     prompt: `How often would these roads need to flood for you to use them differently than you do now?`,
    //     onlyFlooding: false,
    //     singlePlace: false,
    //     featureTypes: ['polyline']
    // },
    // 8: {
    //     prompt: "Looking through your list of places, are there comparable alternatives for each place?",
    //     onlyFlooding: false,
    //     singlePlace: false,
    //     featureTypes: ['circle']
    // },
    // 9: {
    //     prompt: "If these places were too severely flooded, how long would you be willing to travel to a comparable, alternative place?",
    //     onlyFlooding: false,
    //     singlePlace: false,
    //     featureTypes: ['circle']
    // },
    // 9: {
    //     prompt: "If your usual route were too severely flooded, how long would you be willing to travel on an alternate route?",
    //     onlyFlooding: false,
    //     singlePlace: false,
    //     featureTypes: ['polyline']
    // },
    6: {
        prompt: `<div class="alert-success rounded">Done</div>`,
        onlyFlooding: false,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    }
};

// Feature category config
// - tag (str): The internal category tag. Not shown to user. Output in GEOJSON.
// - label (str): The display label. Shown to user. Not output in GEOJSON.
var CATEGORIES = {
    1: {
        tag: "residence",
        label: "primary residence"
    },
    2: {
        tag: "property",
        label: "other property"
    },
    3: {
        tag: "work",
        label: "work or occupation"
    },
    4: {
        tag: "goodssvcs",
        label: "groceries and services"
    },
    5: {
        tag: "relax",
        label: "place to relax by self"
    },
    6: {
        tag: "connect",
        label: "place to connect with others"
    },
    7: {
        tag: "street",
        label: "local street"
    },
    8: {
        tag: "majorroad",
        label: "major road or bridge"
    },
    9: {
        tag: "other",
        label: "other place of concern"
    }
}


// --- UTILITIES ---
// Fetch URL query parameters
$.urlParam = function(name){
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null) {
       return null;
    }
    return decodeURI(results[1]) || 0;
}

// URL parameter: respondent ID
var respID = $.urlParam("r");

// URL parameter: cache
var cache = $.urlParam("cache");

// JS objecct size
function _oSize(o) {
    return(Object.keys(o).length);
}

// Check if arrays contain the same items
// https://stackoverflow.com/a/16436975
function _arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// --- BASEMAPS ---
// https://gis.stackexchange.com/a/341490
var bm_googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3'],
    useCache: true,
    useOnlyCache: false,
	crossOrigin: true,
    cacheMaxAge: 2.6298e+9 // 1 month
});

var bm_googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});

var bm_googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});

var bm_osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    // maxZoom: 18,
});

var bm_Esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    // attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
});

var bm_Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    // attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var bm_USGS_USImageryTopo = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20,
    attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
});



// --- CUSTOM MAP LAYERS (OVERLAYS) ---
// localization -- update with relevant AOI and roads GEOJSON
var county = L.geoJSON(carteret_co,{
    style: {
        "color": "#ff7800",
        "weight": 3,
        "opacity": 0.65,
        "fillOpacity": 0
    }
});

var county_roads = L.geoJSON(carteret_co_roads, {
    style: {
        "color": "#000000",
        "weight": 0,
        "opacity": 0
    },
    onEachFeature: (f, l) => {
        if (f.properties.FULLNAME) {
            l.bindTooltip(f.properties.FULLNAME, {
                direction: 'center',
                permanent: false
            });
        }
    }
});
carteret_co_roads = undefined; // unset to unload large GEOJSON object


// --- MAP ---
// Default map view -- localization -- update default map view
var defaultView = {
    center: [34.80675621590259, -76.5376809057703],
    zoom: 11
};

// Initialize Leaflet map
var map = L.map('map',{
    center: defaultView.center,
    zoom: defaultView.zoom,
    layers: [county,bm_googleStreets] // initial layers and basemap
});

// Remove unneeded default controls
map.attributionControl.remove();
map.zoomControl.remove()


// Layer control
// Overlays -- localization -- replace with relevant AOI and road feature set
var overlays = {
    "County Outline": county,
    "Roads": county_roads
}

// Basemaps
var baseMaps = {
    "Google Streets": bm_googleStreets,
    "Google Hybrid": bm_googleHybrid,
    "Google Imagery": bm_googleSat,
    "ESRI Topo": bm_Esri_WorldTopoMap,
    "ESRI Imagery": bm_Esri_WorldImagery,
    // "OpenStreetMap": bm_osm,
    // "USGS Hybrid": bm_USGS_USImageryTopo
};

// Initialize layer control
var layerControl = L.control.layers(baseMaps,overlays,{
    position: 'bottomright'
});

// Roads search (search within supplied feature set)
// Initialize search control
var searchControl = new L.Control.Search({
    layer: county_roads,
    propertyName: 'FULLNAME', // Feature attribute/property to search over
    marker: false,
    moveToLocation: function (latlng, title, map) {
        var zoom = map.getBoundsZoom(latlng.layer.getBounds());
        map.setView(latlng, zoom);
    }
});

// Search control on location found event handler
searchControl.on('search:locationfound', (e) => {
    // style matched feature
    e.layer.setStyle({ 
        color: '#ffff1c', 
        weight: 3, 
        opacity: 0.9 
    });

    // label matched feature
    if (e.layer.feature.properties.FULLNAME) {
        e.layer.bindTooltip(e.layer.feature.properties.FULLNAME, {
            permanent: true
        }).openTooltip();
    }
});

// Search control on searchbox collapse event handler
searchControl.on('search:collapsed', (e) => {
    // reset all road layers to hidden
    county_roads.eachLayer((l) => {
        county_roads.resetStyle(l);
        l.unbindTooltip();
    });
});

// Add search control
map.addControl(searchControl);


// Geocoder control
var geocode_layers = [];

var geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    geocoder: new L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
            viewbox: '-76,35,-77,34', // localization - update geocoder search bounds
            bounded: 1
        }
    }),
    position: 'bottomright',
    collapsed: true
}).on('markgeocode', function(e) {
    _removeGeocodeLayers();
    var bbox = e.geocode.bbox;
    var poly = L.polygon([
        bbox.getSouthEast(),
        bbox.getNorthEast(),
        bbox.getNorthWest(),
        bbox.getSouthWest()
    ]).addTo(map);
    map.fitBounds(poly.getBounds());
    map.setZoom(map.getZoom() - 1);
    geocode_layers.push(poly);
}).addTo(map);

function _removeGeocodeLayers() {
    geocode_layers.forEach((l) => {l.remove()});
}

layerControl.addTo(map);
$('.leaflet-control-geocoder-icon').css('background-image','none').text('📍');

function _toDefaultView() {
    map.setView(defaultView.center, defaultView.zoom);
}


// Custom control to reset map view
var resetControl = L.Control.extend({
    options: {
        position: 'topleft'
    },

    onAdd: function(map) {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';     
        container.style.width = '30px';
        container.style.height = '30px';
        container.style.cursor = 'pointer';
        container.style.textAlign = 'center';
        container.style.lineHeight = '24px';
        container.style.fontSize = '1.7em';
        container.title = 'Reset map view';
        container.innerHTML = '&#x21bb;'; // Reset icon (you can customize this)

        container.onclick = function() {
            _toDefaultView();
        };

        return container;
    }
});
// map.addControl(new resetControl());

// Basemap tile caching
// Note: currently only implemented for googleStreets basemap. 
// Caching status vars
var totalToCache = 0;
var remainingToCache = 0;
var initialCache = false;

// Disable map on cache seed start
bm_googleStreets.on('seedstart',(e)=>{
    totalToCache = e.queueLength;

    if (initialCache) {
        // map.fitBounds(county.getBounds());
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map._container.style.opacity = 0.5;
    }
    
    console.log(`caching tiles at zoom level ${cache} with queue length ${e.queueLength}...`);
});

// Update cache progress indicator
bm_googleStreets.on('seedprogress',(e)=>{
    remainingToCache = e.remainingLength;
    perc = Math.round((totalToCache - remainingToCache)/totalToCache*100);
    $('#cache-bar').removeClass('bg-success bg-warning').addClass('bg-danger').css('width',perc+'%').attr('aria-valuenow',perc)[0].innerHTML = `${perc}% cached (${remainingToCache} to go)`
});

// Enable map on cache seed end
bm_googleStreets.on('seedend',(e)=>{
    initialCache = false;

    console.log(`finished seeding cache.`);

    map.dragging.enable();
    map.scrollWheelZoom.enable();

    if (initialCache) {
        setTimeout(function(){ 
            _toDefaultView();
        }, 400);
    }
    
    $('#cache-bar').removeClass('bg-danger bg-warning').addClass('bg-success').css('width','100%').attr('aria-valuenow',100)[0].innerHTML = `Cached`
    map._container.style.opacity = 1;
});

// Update cache indictor if cache is missing in map extent
bm_googleStreets.on('tilecachemiss',(e)=>{
    // console.log(`cache miss`);
    $('#cache-bar').addClass('bg-success').removeClass('bg-danger').css('opacity',0.8)[0].innerHTML = `Cache missing`;
});

// Update cache indicator if cache is complete in map extent
bm_googleStreets.on('tilecachehit',(e)=>{
    if (remainingToCache <= 1) {
        $('#cache-bar').removeClass('bg-danger bg-warning').addClass('bg-success').css('opacity',1)[0].innerHTML = `Cached`;
    } else {
        // could not finish caching!
        $('#cache-bar').removeClass('bg-success bg-warning').addClass('bg-danger').css('width','100%').attr('aria-valuenow',100)[0].innerHTML = `Check connection ⏤ failed to finish caching! (${remainingToCache-1} to go)`
    }
});

// If cache URL parameter set (for initial full extent caching)
if (cache > 0) {
    initialCache = true;
    bm_googleStreets.seed(map.getBounds(),10, cache);
}

// Caching indicator click event handler
$('.cache-status').on('click', ()=>{
    // Display stats
    bm_googleStreets._db.info().then(function (r) {
        alert(`Tile cache file count: ${r.doc_count} \nTiles attempting to cache: ${totalToCache} \nTiles remaining to cache: ${remainingToCache}`);
    }).catch((err) => {
        console.log(err);
    });
});


// --- FEATURE DRAWING ---
// Feature group to store all drawn features
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Ascending feature ID counter
var idCounter = 0;

// Initialize draw control
var drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    // Enable additional feature geometries here
    draw: {
        polygon: false,
        polyline: {
            shapeOptions: {
                color: 'red'
            },
            repeatMode: REPEAT_MODE
        },
        rectangle: false,
        circle: {
            shapeOptions: {
                color: 'red'
            },
            repeatMode: REPEAT_MODE
        },
        marker: false,
        circlemarker: false
    }
});
map.addControl(drawControl);

// Define clicked (flooding) feature style
var clickStyle =  {
    fillColor: "#337ab7",
    color: "#337ab7",
    weight: 3,
    opacity: 1,
    fillOpacity: 0.2,
}

// Define unclicked (not flooding/default) feature style
var unclickStyle = {
    fillColor: "#ff0000",
    color: "#ff0000",
    weight: 3,
    opacity: 1,
    fillOpacity: 0.2,
}

// Feature click handler (toggles style and feature property)
function clickOnMarker(e){
    if (e.target.feature.properties.clicked) {
        e.target.setStyle(unclickStyle);
        e.target.feature.properties.clicked = false;
    } else {
        e.target.setStyle(clickStyle);
        e.target.feature.properties.clicked = true;
    }
    updateLabelsTable();
}


// --- MODAL FORMS ---
// Define vars
var modal = $('#labelModal'); // new feature create modal
var modalEdit = $('#labelModalEdit'); // feature edit modal
var modalRespID = $('#respondentIDModal'); // respondent ID modal
var currentLayer = null;
var currentLayerType = null;

// WWhen new feature created
map.on('draw:created', function (e) {
    idCounter++;
    currentLayer = e.layer; // Store the layer
    currentLayerType = e.layerType; // Store the layer type
    modal.modal('show'); // Show the modal using Bootstrap
});

// Empty the new feature modal label text box on show
modal.on('show.bs.modal', (e) => {
    document.getElementById("circleLabel").value = "";
});

// On all modals, focus on the .focus-input element and hide errors
$(".modal").on('shown.bs.modal', (e) => {
    $(e.target.getElementsByClassName('focus-input')).focus()
}).on('show.bs.modal',()=>{
    $('.error').hide();
}).on('hide.bs.modal',()=>{
    $('.error').hide();
});

// Reset the new feature modal on hide
modal.on('hidden.bs.modal', function () {
    currentLayer = null; // Reset the current layer when the modal is hidden
    currentLayerType = null;
    _clearCategoryCheckboxes()
});

// Resert the edit feature modal on hide
modalEdit.on('hidden.bs.modal', function () {
    _clearCategoryCheckboxes()
});

// Respondent ID modal form handler
$('#respondentIDForm').on('submit', (e) => {
    e.preventDefault();
    respID = document.getElementById("respondentIDInput").value;
    modalRespID.modal('hide');
    $('#help').html(respID + ' &#9432;');
});
modalRespID.modal('show');

// New feature model form handler
$('#labelForm').on('submit', function (event) {
    event.preventDefault();

    var label = document.getElementById("circleLabel").value;
    var categories = [];

    $.each(CATEGORIES, (i,o) => {
        cb = $('#check-' + o.tag + '-initial')[0];
        if (cb.checked) {
            categories.push(o.tag);
        }
    });

    if (categories.length == 0) {
        _errorNoCategory();
        return(false);
    }

    currentLayer.bindTooltip(idCounter.toString() + ": " + label, { 
        permanent: true,
        direction: 'top'
    }).openTooltip();
    currentLayer.feature = {
        type: 'Feature',
        properties: {
            id: idCounter,
            label: label,
            clicked: false,
            order: drawnItems.getLayers().length,
            type: currentLayerType,
            categories: categories,
            categoryLabels: _makeCategoryLabels(categories)
        }
    };
    currentLayer.on('click', clickOnMarker);
    currentLayer.setStyle(unclickStyle);
    drawnItems.addLayer(currentLayer);
    updateLabelsTable();
    if (currentLayerType === 'circle') {
        currentLayer.setRadius(MARKER_DIAMETER_METERS);
    }
    modal.modal('hide'); // Hide the modal using Bootstrap
});

// Set up the edit modal on open
function openEditModal(layer) {
    modalEdit.modal('show');

    // Populate modal with existing properties
    document.getElementById('circleLabelEdit').value = layer.feature.properties.label;

    layer.feature.properties.categories.forEach((o) =>{
        $('#check-' + o + '-edit')[0].checked = true;
    });

    // Remove any existing event listeners to avoid duplicates
    $('#labelFormEdit').off('submit');

    // Save changes to the layer when the form is submitted
    $('#labelFormEdit').on('submit', function(event) {
        event.preventDefault();
        
        var label = document.getElementById('circleLabelEdit').value;
        var categories = [];

        $.each(CATEGORIES, (i,o) => {
            cb = $('#check-' + o.tag + "-edit")[0];
            if (cb.checked) {
                categories.push(o.tag);
            }
        });

        if (categories.length == 0) {
            _errorNoCategory();
            return(false);
        }

        layer.feature.properties.label = label;
        layer.feature.properties.categories = categories;
        layer.feature.properties.categoryLabels = _makeCategoryLabels(categories);
        layer.setTooltipContent(layer.feature.properties.id + ": " + label);
        modalEdit.modal('hide');
        updateLabelsTable();
    });
}


// Modal form category handling
// Create comma-separated category label list for feature
function _makeCategoryLabels(categoryArray) {
    noCats = categoryArray.length;
    catCt = 1;
    cats = '';
    categoryArray.forEach((o) => {
        cats += CATEGORIESLookUp[o];
        if (catCt < noCats) {cats += ', '}
        catCt++;
    });
    return(cats);
}

// Show no category selected error
function _errorNoCategory() {
    $('.error-no-category').show();
}


// --- FEATURE TABLE ---
// Update table after editing or deleting features
map.on('draw:editstop', () => {
    updateLabelsTable();
}).on('draw:deletestop', () => {
    updateLabelsTable();
});

// Utility vars
var labels = [];
var circleLabels = [];

// Table updater
function updateLabelsTable(
    onlyFlooding = false, // apply prompt-based filters
    featureTypes = false 
) {
    labels = [];
    circleLabels = [];
    drawnItems.eachLayer((layer) => {
        if (layer.feature && layer.feature.properties.label) {
            newLabel = {
                id: layer.feature.properties.id,
                label: layer.feature.properties.label,
                layer: layer,
                order: layer.feature.properties.order,
                type: layer.feature.properties.type,
                categories: layer.feature.properties.categoryLabels
            };
            labels.push(newLabel);
            if (layer.feature.properties.type == 'circle') {
                circleLabels.push(newLabel);
            }
        }
    });

    // Sort labels by order
    labels.sort((a, b) => (a.order || 0) - (b.order || 0));

    var tableBody = document.querySelector('#labels-table tbody');
    tableBody.innerHTML = '';

    labels.forEach((item) => {
        // check if only flooding
        if (onlyFlooding && !item.layer.feature.properties.clicked) {
            return(false);
        }

        // check layer type
        if (featureTypes && !(featureTypes.includes(item.type))) {
            return(false);
        }

        var row = document.createElement('tr');
        row.setAttribute('data-id', item.id);

        // ID
        var idCell = document.createElement('td');
        idCell.textContent = item.id;

        // Shape
        var shapeCell = document.createElement('td');
        if (item.type === 'circle')     {shapeCell.innerHTML = '&#9711;'}
        if (item.type === 'polyline')   {shapeCell.textContent = '⏤'}
        
        // Label
        var labelCell = document.createElement('td');
        var labelLink = document.createElement('a');
        labelLink.href = "#";
        labelLink.textContent = item.label;
        // labelLink.style.color = "#337ab7";
        // labelLink.style.textDecoration = "underline";
        labelLink.addEventListener('click', function(event) {
            event.preventDefault();
            if (item.type === 'circle')     {map.setView(item.layer.getLatLng(), 14)}
            if (item.type === 'polyline')   {map.fitBounds(item.layer.getBounds(), 14)}
        });
        labelCell.appendChild(labelLink);

        // Categories
        var categoriesCell = document.createElement('td');
        categoriesCell.innerHTML = item.categories;

        // Flooding checkbox
        var checkboxCell = document.createElement('td');
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.layer.feature.properties.clicked;
        checkbox.addEventListener('change', function() {
            item.layer.feature.properties.clicked = checkbox.checked;
            if (checkbox.checked) {
                item.layer.setStyle(clickStyle);
            } else {
                item.layer.setStyle(unclickStyle);
            }
        });
        // if (stepView == 2) {
            checkboxCell.appendChild(checkbox);
            $(checkboxCell).addClass('text-center');
        // }

        // Edit
        var editCell = document.createElement('td');
        var editIcon = document.createElement('span');
        editIcon.className = 'edit-icon';
        editIcon.textContent = '✏️ ';
        editIcon.style.cursor = 'pointer';
        editIcon.addEventListener('click', function() {
            openEditModal(item.layer);
        });
        editCell.appendChild(editIcon);

        // var deleteCell = document.createElement('td');
        var deleteIcon = document.createElement('span');
        deleteIcon.className = 'delete-icon';
        deleteIcon.textContent = '🗑️';
        deleteIcon.style.cursor = 'pointer';
        deleteIcon.addEventListener('click', function() {
            drawnItems.removeLayer(item.layer);
            updateLabelsTable();
        });
        editCell.appendChild(deleteIcon);
        $(editCell).addClass('text-right');

        row.appendChild(idCell);
        row.appendChild(shapeCell);
        row.appendChild(labelCell);
        row.appendChild(categoriesCell);
        row.appendChild(checkboxCell);
        row.appendChild(editCell);

        tableBody.appendChild(row);
    });

    // Update the counter on the export button
    if (labels.length > 0) {
        // $('#export-btn').textContent = `Export ${labels.length} places`;
        $('.min-one-place-btn').addClass('enabled').removeClass("disabled").removeAttr("disabled");
    } else {
        _step1View();
        // $('#export-btn').textContent = `Export places`;
        $('.min-one-place-btn').removeClass('enabled').addClass("disabled").attr("disabled","disabled");
    }

    // cache state locally
    localStorage['down-east-flooding-cache-'+respID] = JSON.stringify(drawnItems.toGeoJSON());
}


// --- GEOJSON EXPORT ---
function exportList(verify) {
    if (drawnItems.getLayers().length == 0) {return false}

    var ready = true;
    drawnItems.getLayers().forEach((l) => {
        if(!l.feature.properties.clicked){
            ready = false;
        }
    });
    if (!ready && verify) {
        alert("There are still unverified places!");
        return false;
    }

    var data = drawnItems.toGeoJSON();
    var blob = new Blob([JSON.stringify(data)], {type: "application/json"});
    var url = URL.createObjectURL(blob);

    if (!respID) {
        respID = prompt("Respondent ID");
    }
    var a = document.createElement('a');
    a.href = url;
    a.download = 'markers_'+respID+'.geojson';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

$('#export-btn').click((e) => {
    // do not verify
    exportList(false);
});

window.onbeforeunload = function() {
    localStorage['down-east-flooding-cache-'+respID] = JSON.stringify(drawnItems.toGeoJSON());
    return "Are you sure you want to leave this page?";
};


// --- HOTKEYS ---
Mousetrap.bind(['r','esc'], function(e) {
    _toDefaultView();
    _removeGeocodeLayers();
    return false;
});

Mousetrap.bind(['g'], function(e) {
    geocoder.getContainer().getElementsByTagName("input")[0].focus()
    return false;
});

Mousetrap.bind(['c','n'], function(e) {
    document.getElementsByClassName("leaflet-draw-draw-circle")[0].click()
    return false;
});

Mousetrap.bind(['l'], function(e) {
    document.getElementsByClassName("leaflet-draw-draw-polyline")[0].click()
    return false;
});

Mousetrap.bind(['e'], function(e) {
    exportList();
    return false;
});

Mousetrap.bind(['t'], function(e) {
    if (map.getZoom() > 14) {
        googleStreets.seed(map.getBounds(), 13, 17);
    }
    return false;
});


// --- HELP MODAL ---
$("#help").click((e) => {
    $('#helpModal').modal('show');
});
// $('#helpModal').modal('show'); // show on start


// --- STEP HANDLER ---
var stepView = 1;

function _prevStepBtnDefault() {
    $('#prev-step-btn').unbind('click').click((e) => {
        _updatePrevStep();
    });
}
_prevStepBtnDefault();

function _nextStepBtnDefault() {
    $('#next-step-btn').unbind('click').click((e) => {
        _updateNextStep();
    });
}
_nextStepBtnDefault();

// Define the step 1 (list and map places) view
function _step1View() {
    if (stepView == 1) {return false}
    stepView = 1;
    $('.s2-wide').animate({'width':'30vw'}, 350);
    $('.s2-narrow').animate({'width':'70vw'},400);
    $('.s2-show').css('color','transparent');
    // geocoder.options.collapsed = false;
    // geocoder.remove().addTo(map);
    _updatePlaceDescriptor();
    setTimeout(function(){ 
        map.invalidateSize();
        $('#prev-step-btn, #export-btn').attr('hidden','hidden');
        $('#next-step-btn').removeAttr('hidden');
    }, 400);
    updateLabelsTable();
    promptIndex = 1;   
}

// Define the step 2 (describe places with prompts) view
function _step2View() {
    if (stepView == 2) {return false}
    stepView = 2;
    $('.s2-narrow').animate({'width':'20vw'},350);
    $('.s2-wide').animate({'width':'80vw'}, 400);
    $('.s2-show').css('color','rgb(33, 37, 41)');
    // geocoder.options.collapsed = true;
    // geocoder.remove().addTo(map);
    setTimeout(function(){ 
        map.invalidateSize();
        $('#prev-step-btn').removeAttr('hidden');
        _updatePlaceDescriptor();
    }, 400);
    updateLabelsTable();
}

// Update the prompt
function _updatePlaceDescriptor() {
    if (stepView == 2) {
        d = PROMPTS[promptIndex];

        if (d.singlePlace) {
            if (_arraysEqual(d.featureTypes,['circle'])) {
                labelsToIterate = circleLabels;
            } else {
                labelsToIterate = labels;
            }

            $('#labels-table').hide();

            if (currentPlace == 0 && labelsToIterate.length > 1) {
                $('#prev-step-btn').unbind('click').click((e) => {
                    _prevPlace();
                });

                $('#next-step-btn').unbind('click').click((e) => {
                    _nextPlace(labelsToIterate.length);
                });
            }

            $('#place-descriptors h1').html(
                d.prompt.replaceAll('{{place}}',labelsToIterate[currentPlace].label + ` (${labelsToIterate[currentPlace].id})`) // + ` (${labels[currentPlace].categories})`)
            ).css('margin-bottom','0.2em');
            $('#place-descriptors > small').text("(" + promptIndex + "/" + _oSize(PROMPTS) + ")").css('margin-bottom','0.4em');

            map.fitBounds(labelsToIterate[currentPlace].layer.getBounds())

            return(true);
        } else {
            _toDefaultView();
        }
        

        // default behaviors
        $('#labels-table').show();
        currentPlace = 0;
        _prevStepBtnDefault();
        _nextStepBtnDefault();

        $('#place-descriptors h1').html(d.prompt).css('margin-bottom','0.2em');
        $('#place-descriptors > small').text("(" + promptIndex + "/" + _oSize(PROMPTS) + ")").css('margin-bottom','0.4em');
        updateLabelsTable(
            onlyFlooding = d.onlyFlooding, 
            featureTypes = d.featureTypes
        );
        return(true);
    } else {
        $('#place-descriptors h1, #place-descriptors small').text("").css('margin-bottom','0');
        updateLabelsTable();
        return(true);
    }
}



// Single place handler
var currentPlace = 0;

function _prevPlace() {
    if (currentPlace > 0) {
        currentPlace--;
        _updatePlaceDescriptor();
    } else {
        _updatePlaceDescriptor();
        _prevStepBtnDefault();
    }
}

function _nextPlace(labelsToIterateLength) {
    // this will not apply other prompt-based filters...
    if (currentPlace+2 < labelsToIterateLength) {
        currentPlace++;
        _updatePlaceDescriptor();
    } else {
        currentPlace++;
        _updatePlaceDescriptor();
        _nextStepBtnDefault();
    }
}


// Prev button handler
function _updatePrevStep() {
    if (promptIndex == 1) {
        // go to step 1 view
        return(_step1View());
    } else {
        // decrement place descriptor
        promptIndex--;
        _updatePlaceDescriptor();
        $('#next-step-btn').removeAttr('hidden');
        $('#export-btn').attr('hidden','hidden');
    }
}


// Next button handler
function _updateNextStep() {
    if (stepView == 1) {
        // go to step 2 view
        promptIndex = 1;
        return(_step2View());
    }
    else if (_oSize(PROMPTS) - 1 == promptIndex) {
        // export button show
        promptIndex++;
        _updatePlaceDescriptor();
        $('#export-btn').removeAttr('hidden');
        $('#next-step-btn').attr('hidden','hidden');
    } else {
        // increment place descriptor
        promptIndex++;
        _updatePlaceDescriptor();
        $('#next-step-btn').removeAttr('hidden');
        $('#export-btn').attr('hidden','hidden');
    }
}


// Place descriptor handlers
var promptIndex = 1;
var CATEGORIESLookUp = {}

$.each(CATEGORIES, (i,e) => {
    CATEGORIESLookUp[e.tag] = e.label;
    ['initial','edit'].forEach((o) => {
        temp = `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" id="check-${e.tag}-${o}">
            <label class="form-check-label" for="check-${e.tag}-${o}">
                ${e.label}
            </label>
        </div>`;
        $input = $(temp);
        $(`.place-categories-${o}`).append($input);
    });
});

function _clearCategoryCheckboxes() {
    $('.place-categories input').each((i,o) => {
        o.checked = false;
    });
}