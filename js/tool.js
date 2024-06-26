// Utils
$.urlParam = function(name){
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null) {
       return null;
    }
    return decodeURI(results[1]) || 0;
}

function _oSize(o) {
    return(Object.keys(o).length);
}

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

var respID = $.urlParam("r");
var cache = $.urlParam("cache");



// Basemaps
// https://gis.stackexchange.com/a/341490
googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3'],
    useCache: true,
    // useOnlyCache: true,
	crossOrigin: true,
    cacheMaxAge: 2.6298e+9 // 1 month
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



// Map
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
carteret_co_roads = undefined; // unset

var defaultView = {
    center: [34.80675621590259, -76.5376809057703],
    zoom: 11
};

var map = L.map('map',{
    center: defaultView.center,
    zoom: defaultView.zoom,
    layers: [county,googleStreets]
});
map.attributionControl.remove();
map.zoomControl.remove()

var overlays = {
    "County Outline": county,
    "Roads": county_roads
}

var baseMaps = {
    "Google Streets": googleStreets,
    "Google Hybrid": googleHybrid,
    "Google Imagery": googleSat,
    "ESRI Topo": Esri_WorldTopoMap,
    "ESRI Imagery": Esri_WorldImagery,
    // "OpenStreetMap": osm,
    // "USGS Hybrid": USGS_USImageryTopo
};

var layerControl = L.control.layers(baseMaps,overlays,{
    position: 'bottomright'
});



// Roads search
var searchControl = new L.Control.Search({
    layer: county_roads,
    propertyName: 'FULLNAME',
    marker: false,
    moveToLocation: function (latlng, title, map) {
        var zoom = map.getBoundsZoom(latlng.layer.getBounds());
        map.setView(latlng, zoom);
    }
});

searchControl.on('search:locationfound', (e) => {
    e.layer.setStyle({ 
        color: '#ffff1c', 
        weight: 3, 
        opacity: 0.9 
    });
    if (e.layer.feature.properties.FULLNAME) {
        e.layer.bindTooltip(e.layer.feature.properties.FULLNAME, {
            permanent: true
        }).openTooltip();
    }
}).on('search:collapsed', (e) => {
    county_roads.eachLayer((l) => {
        county_roads.resetStyle(l);
        l.unbindTooltip();
    });
});

map.addControl(searchControl);



// Tile cache
var totalToCache = 0;
var remainingToCache = 0;
var initialCache = false;

googleStreets.on('seedstart',(e)=>{
    totalToCache = e.queueLength;

    if (initialCache) {
        map.fitBounds(county.getBounds());
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map._container.style.opacity = 0.5;
    }
    
    console.log(`caching tiles at zoom level ${cache} with queue length ${e.queueLength}...`);
});

googleStreets.on('seedprogress',(e)=>{
    remainingToCache = e.remainingLength;
    perc = Math.round((totalToCache - remainingToCache)/totalToCache*100);
    $('#cache-bar').removeClass('bg-success bg-warning').addClass('bg-danger').css('width',perc+'%').attr('aria-valuenow',perc)[0].innerHTML = `${perc}% cached (${remainingToCache} to go)`
});

googleStreets.on('seedend',(e)=>{
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

googleStreets.on('tilecachemiss',(e)=>{
    // console.log(`cache miss`);
    $('#cache-bar').addClass('bg-success').removeClass('bg-danger').css('opacity',0.8)[0].innerHTML = `Cache missing`;
});

googleStreets.on('tilecachehit',(e)=>{
    if (remainingToCache <= 1) {
        $('#cache-bar').removeClass('bg-danger bg-warning').addClass('bg-success').css('opacity',1)[0].innerHTML = `Cached`;
    } else {
        // could not finish caching!
        $('#cache-bar').removeClass('bg-success bg-warning').addClass('bg-danger').css('width','100%').attr('aria-valuenow',100)[0].innerHTML = `Check connection ⏤ failed to finish caching! (${remainingToCache-1} to go)`
    }
});

if (cache > 0) {
    initialCache = true;
    googleStreets.seed(county.getBounds(),10, cache);
}

$('.cache-status').on('click', ()=>{
    googleStreets._db.info().then(function (r) {
        alert(`Tile cache file count: ${r.doc_count} \nTiles attempting to cache: ${totalToCache} \nTiles remaining to cache: ${remainingToCache}`);
    }).catch(function (err) {
        console.log(err);
    });
});



// Draw handling
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
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



// Modal handling
var modal = $('#labelModal');
var modalEdit = $('#labelModalEdit');
var modalRespID = $('#respondentIDModal');
var currentLayer = null;
var currentLayerType = null;

map.on('draw:created', function (e) {
    idCounter++;
    var layer = e.layer;
    // if (e.layerType === 'circle') {
    currentLayer = layer; // Store the layer
    currentLayerType = e.layerType; // Store the layer type
    modal.modal('show'); // Show the modal using Bootstrap
    // }
});

modal.on('show.bs.modal', function (e) {
    document.getElementById("circleLabel").value = "";
});

$(".modal").on('shown.bs.modal', function (e) {
    $(e.target.getElementsByClassName('focus-input')).focus()
}).on('show.bs.modal',()=>{
    $('.error').hide();
}).on('hide.bs.modal',()=>{
    $('.error').hide();
});

modal.on('hidden.bs.modal', function () {
    currentLayer = null; // Reset the current layer when the modal is hidden
    currentLayerType = null;
    _clearCategoryCheckboxes()
});

modalEdit.on('hidden.bs.modal', function () {
    _clearCategoryCheckboxes()
});

$('#respondentIDForm').on('submit', (e) => {
    e.preventDefault();
    respID = document.getElementById("respondentIDInput").value;
    modalRespID.modal('hide');
    $('#help').html(respID + ' &#9432;');
});
modalRespID.modal('show');

$('#labelForm').on('submit', function (event) {
    event.preventDefault();

    var label = document.getElementById("circleLabel").value;
    var categories = [];

    $.each(placeCategories, (i,o) => {
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

        $.each(placeCategories, (i,o) => {
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



// Category handling
function _makeCategoryLabels(categoryArray) {
    noCats = categoryArray.length;
    catCt = 1;
    cats = '';
    categoryArray.forEach((o) => {
        cats += placeCategoriesLookUp[o];
        if (catCt < noCats) {cats += ', '}
        catCt++;
    });
    return(cats);
}

function _errorNoCategory() {
    $('.error-no-category').show();
}



// Table handling
map.on('draw:editstop', function () {
    updateLabelsTable();
}).on('draw:deletestop', function () {
    updateLabelsTable();
});

var labels = [];
var circleLabels = [];
function updateLabelsTable(
    onlyFlooding = false, 
    featureTypes = false
) {
    labels = [];
    circleLabels = [];
    drawnItems.eachLayer(function (layer) {
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

    labels.forEach(function (item) {
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



// Export handling
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



// Hotkeys
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



// Help
$("#help").click((e) => {
    $('#helpModal').modal('show');
});
// show on start
// $('#helpModal').modal('show');



// Step handler
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
    placeDescriptorIndex = 1;   
}

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

function _updatePlaceDescriptor() {
    if (stepView == 2) {
        d = placeDescriptors[placeDescriptorIndex];

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
                    _nextPlace();
                });
            }

            $('#place-descriptors h1').html(
                d.prompt.replaceAll('{{place}}',labelsToIterate[currentPlace].label + ` (${labelsToIterate[currentPlace].id})`) // + ` (${labels[currentPlace].categories})`)
            ).css('margin-bottom','0.2em');
            $('#place-descriptors > small').text("(" + placeDescriptorIndex + "/" + _oSize(placeDescriptors) + ")").css('margin-bottom','0.4em');

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
        $('#place-descriptors > small').text("(" + placeDescriptorIndex + "/" + _oSize(placeDescriptors) + ")").css('margin-bottom','0.4em');
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

function _nextPlace() {
    // this will not apply other prompt-based filters...
    if (currentPlace+2 < labels.length) {
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
    1: {
        prompt: "At which of these places have you seen flooding?",
        onlyFlooding: false,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    },
    2: {
        prompt: "Which of these places are most affected by flooding?",
        onlyFlooding: true,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    },
    3: {
        prompt: "How often does it flood at each place?",
        onlyFlooding: true,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    },
    4: {
        prompt: "How does flooding at each place disrupt your day-to-day life, if at all?",
        onlyFlooding: true,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    },
    5: {
        prompt: "How do you deal with flooding at each place?",
        onlyFlooding: true,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    },
    6: {
        prompt: `<br><h3>If <div class="alert-info p-2 d-inline-block rounded border border-info">{{place}}</div> were flooding enough for you</h3><h3>to use <div class="alert-info p-2 d-inline-block rounded border border-info">{{place}}</div> differently than you do now...</h3>`+
         `<h1>How deep would the water be? <br />Where would the water be? <br />How often would it be flooding?</h1>`,
        onlyFlooding: false,
        singlePlace: true,
        featureTypes: ['circle']
    },
    7: {
        prompt: `How often would these roads need to flooding for your to use them differently than you do now?`,
        onlyFlooding: false,
        singlePlace: false,
        featureTypes: ['polyline']
    },
    8: {
        prompt: "Looking through your list of places, are there comparable alternatives for each place?",
        onlyFlooding: false,
        singlePlace: false,
        featureTypes: ['circle']
    },
    9: {
        prompt: "If these places were too severely flooded, how long would you be willing to travel to a comparable, alternative place?",
        onlyFlooding: false,
        singlePlace: false,
        featureTypes: ['circle']
    },
    // 9: {
    //     prompt: "If your usual route were too severely flooded, how long would you be willing to travel on an alternate route?",
    //     onlyFlooding: false,
    //     singlePlace: false,
    //     featureTypes: ['polyline']
    // },
    10: {
        prompt: `<div class="alert-success rounded">Done</div>`,
        onlyFlooding: false,
        singlePlace: false,
        featureTypes: ['circle','polyline']
    }
};



// Category handling
var placeCategories = {
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
        tag: "street",
        label: "local street"
    },
    5: {
        tag: "majorroad",
        label: "major road or bridge"
    },
    6: {
        tag: "goodssvcs",
        label: "groceries and services"
    },
    7: {
        tag: "relax",
        label: "place to relax by self"
    },
    8: {
        tag: "connect",
        label: "place to connect with others"
    },
    9: {
        tag: "other",
        label: "other place of concern"
    }
}

var placeCategoriesLookUp = {}

$.each(placeCategories, (i,e) => {
    placeCategoriesLookUp[e.tag] = e.label;
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