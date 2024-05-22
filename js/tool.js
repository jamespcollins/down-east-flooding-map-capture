// Utils
function _oSize(o) {
    return(Object.keys(o).length);
}

// https://gis.stackexchange.com/a/341490
googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});
googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});
googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});

var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    // maxZoom: 18,
});

var Esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    // attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
});

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    // attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var USGS_USImageryTopo = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20,
    attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
});

var county = L.geoJSON(carteret_co,{
    style: {
        "color": "#ff7800",
        "weight": 3,
        "opacity": 0.65,
        "fillOpacity": 0
    }
})

var defaultView = {
    // center: county.getBounds().getCenter(),
    center: [34.80675621590259, -76.5376809057703],
    zoom: 11
};

var map = L.map('map',{
    center: defaultView.center,
    zoom: defaultView.zoom,
    layers: [googleStreets]
});
// map.fitBounds(county.getBounds());
// map.setMinZoom(map.getZoom());
map.attributionControl.remove();
map.zoomControl.remove()

county.addTo(map);

var baseMaps = {
    "Google Streets": googleStreets,
    "Google Hybrid": googleHybrid,
    "Google Imagery": googleSat,
    "ESRI Topo": Esri_WorldTopoMap,
    "ESRI Imagery": Esri_WorldImagery,
    "OpenStreetMap": osm,
    "USGS Hybrid": USGS_USImageryTopo
};

var layerControl = L.control.layers(baseMaps)
layerControl.options.position = "bottomright";


// Draw handling
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polygon: false,
        polyline: false,
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

var clickStyle =  {
    fillColor: "#337ab7",
    color: "#337ab7",
    weight: 3,
    opacity: 1,
    fillOpacity: 0.2,
}

var unclickStyle = {
    fillColor: "#ff0000",
    color: "#ff0000",
    weight: 3,
    opacity: 1,
    fillOpacity: 0.2,
}

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

var idCounter = 0;
var currentLayer = null; // To keep track of the current layer

map.on('draw:created', function (e) {
    var layer = e.layer;
    if (e.layerType === 'circle') {
        currentLayer = layer; // Store the layer
        $('#labelModal').show() // Show the modal
    }
});



// Modal handling
var modal = $('#labelModal');
var modalEdit = $('#labelModalEdit');
var currentLayer = null;

map.on('draw:created', function (e) {
    idCounter++;
    var layer = e.layer;
    if (e.layerType === 'circle') {
        currentLayer = layer; // Store the layer
        modal.modal('show'); // Show the modal using Bootstrap
    }
});

modal.on('show.bs.modal', function (e) {
    document.getElementById("circleLabel").value = "";
});

modal.on('shown.bs.modal', function (e) {
    $("#circleLabel").focus();
});
modalEdit.on('shown.bs.modal', function (e) {
    $("#circleLabelEdit").focus();
});

modal.on('hidden.bs.modal', function () {
    currentLayer = null; // Reset the current layer when the modal is hidden
});

$('#labelForm').on('submit', function (event) {
    event.preventDefault();
    var label = document.getElementById("circleLabel").value;

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
            order: drawnItems.getLayers().length
        }
    };
    currentLayer.on('click', clickOnMarker);
    currentLayer.setStyle(unclickStyle);
    drawnItems.addLayer(currentLayer);
    updateLabelsTable();
    currentLayer.setRadius(MARKER_DIAMETER_METERS);
    modal.modal('hide'); // Hide the modal using Bootstrap
});

function openEditModal(layer) {
    modalEdit.modal('show');

    // Populate modal with existing properties
    document.getElementById('circleLabelEdit').value = layer.feature.properties.label;

    // Remove any existing event listeners to avoid duplicates
    $('#labelFormEdit').off('submit');

    // Save changes to the layer when the form is submitted
    $('#labelFormEdit').on('submit', function(event) {
        event.preventDefault();
        var label = document.getElementById('circleLabelEdit').value;

        layer.feature.properties.label = label;
        layer.setTooltipContent(layer.feature.properties.id + ": " + label);
        modalEdit.modal('hide');
        updateLabelsTable();
    });
}



// Table handling
map.on('draw:editstop', function () {
    updateLabelsTable();
}).on('draw:deletestop', function () {
    updateLabelsTable();
});

function updateLabelsTable() {
    var labels = [];
    drawnItems.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties.label) {
            labels.push({
                id: layer.feature.properties.id,
                label: layer.feature.properties.label,
                layer: layer,
                order: layer.feature.properties.order
            });
        }
    });

    // Sort labels by order
    labels.sort((a, b) => (a.order || 0) - (b.order || 0));

    var tableBody = document.querySelector('#labels-table tbody');
    tableBody.innerHTML = '';

    labels.forEach(function (item) {
        var row = document.createElement('tr');
        row.setAttribute('data-id', item.id);

        var idCell = document.createElement('td');
        idCell.textContent = item.id;

        var labelCell = document.createElement('td');
        var labelLink = document.createElement('a');
        labelLink.href = "#";
        labelLink.textContent = item.label;
        // labelLink.style.color = "#337ab7";
        // labelLink.style.textDecoration = "underline";
        labelLink.addEventListener('click', function(event) {
            event.preventDefault();
            map.setView(item.layer.getLatLng(), 14);
            item.layer.openTooltip();
        });
        labelCell.appendChild(labelLink);

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
        checkboxCell.appendChild(checkbox);

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

        row.appendChild(idCell);
        row.appendChild(labelCell);
        row.appendChild(checkboxCell);
        row.appendChild(editCell);

        tableBody.appendChild(row);
    });

    // Update the counter on the export button
    if (labels.length > 0) {
        $('#export-btn').textContent = `Export ${labels.length} places`;
        $('.min-one-place-btn').addClass('enabled').removeClass("disabled").removeAttr("disabled");
    } else {
        _step1View();
        $('#export-btn').textContent = `Export places`;
        $('.min-one-place-btn').removeClass('enabled').addClass("disabled").attr("disabled","disabled");
    }
}



// Export handling
function exportList() {
    if (drawnItems.getLayers().length == 0) {return false}

    var ready = true;
    drawnItems.getLayers().forEach((l) => {
        if(!l.feature.properties.clicked){
            ready = false;
        }
    });
    if (!ready) {
        alert("There are still unverified places!");
        return false;
    }

    var data = drawnItems.toGeoJSON();
    var blob = new Blob([JSON.stringify(data)], {type: "application/json"});
    var url = URL.createObjectURL(blob);

    var respondent = prompt("Respondent ID");
    var a = document.createElement('a');
    a.href = url;
    a.download = 'markers_'+respondent+'.geojson';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

document.getElementById('export-btn').addEventListener('click', exportList);

window.onbeforeunload = function() {
    return "Are you sure you want to leave this page?";
};



// Geocoder control
var geocode_layers = [];

var geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    geocoder: new L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
            viewbox: '-76,35,-77,34',
            bounded: 1
        }
    }),
    collapsed: false
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

// Hotkeys
Mousetrap.bind(['r'], function(e) {
    _toDefaultView();
    return false;
});

Mousetrap.bind(['g'], function(e) {
    geocoder.getContainer().getElementsByTagName("input")[0].focus()
    return false;
});

Mousetrap.bind(['c'], function(e) {
    document.getElementsByClassName("leaflet-draw-draw-circle")[0].click()
    return false;
});

Mousetrap.bind(['e'], function(e) {
    exportList();
    return false;
});

Mousetrap.bind(['esc'], function(e) {
    _toDefaultView();
    _removeGeocodeLayers();
    return false;
});

// Help
$("#help").click((e) => {
    $('#helpModal').modal('show');
});



// Step handler
var stepView = 1;

$('#prev-step-btn').click((e) => {
    _updatePrevStep();
});

$('#next-step-btn').click((e) => {
    _updateNextStep();
});

function _step1View() {
    if (stepView == 1) {return false}
    $('.s2-wide').animate({'width':'30vw'}, 350);
    $('.s2-narrow').animate({'width':'70vw'},400);
    geocoder.options.collapsed = false;
    geocoder.remove().addTo(map);
    _updatePlaceDescriptor();
    setTimeout(function(){ 
        map.invalidateSize();
        $('#prev-step-btn, #export-btn').attr('hidden','hidden');
        $('#next-step-btn').removeAttr('hidden');
    }, 400);
    updateLabelsTable();
    placeDescriptorIndex = 1;
    stepView = 1;
}

function _step2View() {
    if (stepView == 2) {return false}
    $('.s2-narrow').animate({'width':'20vw'},350);
    $('.s2-wide').animate({'width':'80vw'}, 400);
    geocoder.options.collapsed = true;
    geocoder.remove().addTo(map);
    setTimeout(function(){ 
        map.invalidateSize();
        $('#prev-step-btn').removeAttr('hidden');
        _updatePlaceDescriptor();
    }, 400);
    updateLabelsTable();
    stepView = 2;
}

function _updatePlaceDescriptor() {
    if (stepView == 2) {
        $('#place-descriptors h1').text(placeDescriptors[placeDescriptorIndex]).css('margin-bottom','0.2em');
        $('#place-descriptors small').text("(" + placeDescriptorIndex + "/" + _oSize(placeDescriptors) + ")").css('margin-bottom','0.4em');
    } else {
        $('#place-descriptors h1, #place-descriptors small').text("").css('margin-bottom','0');
    }
}


// Prev button handler
function _updatePrevStep() {
    if (placeDescriptorIndex == 1) {
        // go to step 1 view
        return(_step1View());
    } else {
        // decrement place descriptor
        placeDescriptorIndex--;
        _updatePlaceDescriptor();
        $('#next-step-btn').removeAttr('hidden');
        $('#export-btn').attr('hidden','hidden');
    }
}



// Next button handler
function _updateNextStep() {
    if (stepView == 1) {
        // go to step 2 view
        placeDescriptorIndex = 1;
        return(_step2View());
    }
    else if (_oSize(placeDescriptors) - 1 == placeDescriptorIndex) {
        // export button show
        placeDescriptorIndex++;
        _updatePlaceDescriptor();
        $('#export-btn').removeAttr('hidden');
        $('#next-step-btn').attr('hidden','hidden');
    } else {
        // increment place descriptor
        placeDescriptorIndex++;
        _updatePlaceDescriptor();
        $('#next-step-btn').removeAttr('hidden');
        $('#export-btn').attr('hidden','hidden');
    }
}



// Place descriptor handlers
var placeDescriptorIndex = 1;
var placeDescriptors = {
    1: "At which of these places have you seen flooding?",
    2: "Which of these places are most affected by flooding?",
    3: "In the last year, how often did you see flooding at each place?",
    4: "How does flooding at each place disrupt your day-to-day life, if at all?",
    5: "How do you deal with flooding at each place?",
    6: "If you imagine flooding that's severe enough that you can't rely on each place...",
    7: "How deep would the water be?",
    8: "What fraction of the area would be covered by water?",
    9: "How frequent would the flooding be?",
    10: "If each place is too severely flooded, how long are you willing to travel to a comparable place?",
    11: "If your usual route to each place is too severely flooded, how long are you willing to travel on an alternate route?",
    12: "What would you do without each place?"
};
