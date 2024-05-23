# Down East Flooding Map Capture Tool

> This project is a Leaflet.js-based mapping tool for managing geocoded locations with enhanced functionality. Features include geocoding within map bounds, detailed search results, a reset control, modal-based labeling with options, and a sortable table displaying circle properties. Built with Bootstrap for styling and SortableJS for draggable rows, it supports editing and deleting circle entries directly from the table. (ChatGPT)

# Roadmap

## Next version

- search offline road layer

## Future versions

- reload from data form cache
- iPad support, at least using sidecar
    - apple pencil drawing…?
    - findings in sidecar mode: have to use pencil (touch input doesn't work), line drawing ok, hard to hit some inputs, file downloads to computer (nice)
- add place generator questions
- look into selecting tools for road segments
- check at least one category selected -- https://stackoverflow.com/a/30055382
- use jQuery for DOM element creation
- use better geocoder (Google?) -- https://chatgpt.com/share/6ed3205c-5910-4888-8cdd-067caa797da4
- add uncertainty flag
- add matrix to place interpretation

# Bugs

- previous step has extra click in single place mode
- need to prevent table sort when filtered

