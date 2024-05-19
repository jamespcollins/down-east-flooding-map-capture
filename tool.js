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

var defaultView = {
    center: [34.80158464213949, -76.66000448289184],
    zoom: 10
};

var map = L.map('map',{
    center: defaultView.center,
    zoom: defaultView.zoom,
    layers: [Esri_WorldTopoMap]
});
map.setMinZoom(10);
map.attributionControl.remove();

var baseMaps = {
    "ESRI Topo": Esri_WorldTopoMap,
    "ESRI Imagery": Esri_WorldImagery,
    "OpenStreetMap": osm,
    "USGS Hybrid": USGS_USImageryTopo
};

var layerControl = L.control.layers(baseMaps)
layerControl.options.position = "bottomright";

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
    fillColor: "#00ff00",
    color: "#00ff00",
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
    $('#labelForm input[type="checkbox"]').each((i, e) => {
        e.checked = false;
    });
});

modal.on('shown.bs.modal', function (e) {
    $("#circleLabel").focus();
});

modal.on('hidden.bs.modal', function () {
    currentLayer = null; // Reset the current layer when the modal is hidden
});

$('#labelForm').on('submit', function (event) {
    event.preventDefault();
    var label = document.getElementById("circleLabel").value;
    var options = [];
    if (document.getElementById("optionA").checked) options.push("A");
    if (document.getElementById("optionB").checked) options.push("B");
    if (document.getElementById("optionC").checked) options.push("C");

    currentLayer.bindTooltip(idCounter.toString() + ": " + label, { 
        permanent: true,
        direction: 'top'
    }).openTooltip();
    currentLayer.feature = {
        type: 'Feature',
        properties: {
            id: idCounter,
            label: label,
            options: options,
            clicked: false
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
    modal.modal('show');

    // Populate modal with existing properties
    document.getElementById('circleLabel').value = layer.feature.properties.label;
    document.getElementById('optionA').checked = layer.feature.properties.options.includes('A');
    document.getElementById('optionB').checked = layer.feature.properties.options.includes('B');
    document.getElementById('optionC').checked = layer.feature.properties.options.includes('C');

    // Save changes to the layer when the form is submitted
    $('#labelForm').off('submit').on('submit', function(event) {
        event.preventDefault();
        var label = document.getElementById('circleLabel').value;
        var options = [];
        if (document.getElementById('optionA').checked) options.push('A');
        if (document.getElementById('optionB').checked) options.push('B');
        if (document.getElementById('optionC').checked) options.push('C');

        layer.feature.properties.label = label;
        layer.feature.properties.options = options;
        layer.setTooltipContent(label);
        modal.modal('hide');
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
                label: layer.feature.properties.label,
                options: layer.feature.properties.options,
                layer: layer
            });
        }
    });

    var tableBody = document.querySelector('#labels-table tbody');
    tableBody.innerHTML = '';

    labels.forEach(function (item) {
        var row = document.createElement('tr');

        var idCell = document.createElement('td');
        idCell.textContent = item.layer.feature.properties.id;

        var labelCell = document.createElement('td');
        var labelLink = document.createElement('a');
        labelLink.href = "#";
        labelLink.textContent = item.label;
        labelLink.style.color = "#337ab7";
        labelLink.style.textDecoration = "underline";
        labelLink.addEventListener('click', function(event) {
            event.preventDefault();
            map.setView(item.layer.getLatLng(), 14);
            item.layer.openTooltip();
        });
        labelCell.appendChild(labelLink);

        var optionsCell = document.createElement('td');
        optionsCell.textContent = item.options.join(", ");

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
        editIcon.classList = 'edit-icon';
        editIcon.innerHTML = '✏️';
        editIcon.addEventListener('click', function() {
            openEditModal(item.layer);
        });
        editCell.appendChild(editIcon);

        var deleteCell = document.createElement('td');
        var deleteIcon = document.createElement('span');
        deleteIcon.classList = 'delete-icon';
        deleteIcon.innerHTML = '🗑️';
        deleteIcon.addEventListener('click', function() {
            drawnItems.removeLayer(item.layer);
            updateLabelsTable();
        });
        deleteCell.appendChild(deleteIcon);

        row.appendChild(idCell);
        row.appendChild(labelCell);
        row.appendChild(optionsCell);
        row.appendChild(checkboxCell);
        row.appendChild(editCell);
        row.appendChild(deleteCell);
        tableBody.appendChild(row);
    });

    // Update the counter on the export button
    if (labels.length > 0) {
        var button = document.getElementById('export-btn');
        button.textContent = `Export ${labels.length} places`;
        button.classList = "enabled";
        button.disabled = false;
    } else {
        var button = document.getElementById('export-btn');
        button.textContent = `Export places`;
        button.classList = "disabled";
        button.disabled = true;
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
        container.style.lineHeight = '30px';
        container.style.fontSize = '1.7em';
        container.title = 'Reset map view';
        container.innerHTML = '&#x21bb;'; // Reset icon (you can customize this)

        container.onclick = function() {
            _toDefaultView();
        };

        return container;
    }
});

map.addControl(new resetControl());

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
document.getElementById("help").onclick = function () {
    alert("Always export before reloading! \n[c] Place new circle \n[r] Reset map view \n[g] Focus on geocoder \n[e] Export geodata");
}
