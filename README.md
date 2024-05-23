# Down East Flooding Map Capture Tool

> This project is a Leaflet.js-based mapping tool for managing geocoded locations with enhanced functionality. Features include geocoding within map bounds, detailed search results, a reset control, modal-based labeling with options, and a sortable table displaying circle properties. Built with Bootstrap for styling and SortableJS for draggable rows, it supports editing and deleting circle entries directly from the table. (ChatGPT)

# Roadmap

## Next version

- mark flooding on first view
- enter respondent id on startup

## Future versions

- iPad support, at least using sidecar
    - apple pencil drawing…?
- add place generator questions
- look into selecting tools for road segments
- check at least one category selected -- https://stackoverflow.com/a/30055382
- use jQuery for DOM element creation
- use better geocoder (Google?) -- https://chatgpt.com/share/6ed3205c-5910-4888-8cdd-067caa797da4
- add uncertainty flag
- add matrix to web app place interpretation

# Bugs

- need to prevent table sort when filtered

# Implemented

- add caching indicator 3dd96d1d17aa78c5e65eee6c539898b457b15bcd
- add category display to table... filter questions based on this 2d16665519b95288b4740b4a90b8f0dcbb5238d9
    - need to allow multiple categories
- add lines b3ba373334461175336aba8e35e44462f9a85cfe
- add basemap caching 0b470b1b1d3ce8b1d74c65932ee9ed82f856b2bd
- use better basemap (Google) a4f280d9e9765829671e7282a20591bafc46ede8

