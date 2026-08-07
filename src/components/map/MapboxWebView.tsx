import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { WebView } from 'react-native-webview'
import type { ATMWithDistance } from '../../hooks/useATMs'
import { getATMStatus, getATMColor } from '../../hooks/useATMs'
import type { LocationState } from '../../hooks/useLocation'

interface MapboxWebViewProps {
  atms: ATMWithDistance[]
  userLocation: LocationState
  selectedATMId: string | null
  onATMPress: (atm: ATMWithDistance) => void
  lockedIds?: Set<string>
  isPremium?: boolean
  isLoggedIn?: boolean
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || ''

const LOCKED_COLOR = '#9CA3AF'

function buildGeoJSON(
  atms: ATMWithDistance[],
  lockedIds?: Set<string>,
  isPremium?: boolean,
  isLoggedIn?: boolean
) {
  const features = atms.map((atm) => {
    const locked = !isPremium && !(isLoggedIn && lockedIds?.has(atm.id))
    const status = locked ? 'locked' : getATMStatus(atm)
    const color = locked ? LOCKED_COLOR : getATMColor(status)
    return {
      type: 'Feature' as const,
      properties: {
        id: atm.id,
        bank_name: atm.bank_name,
        color,
        has_cash: atm.has_cash,
        status: atm.status,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [atm.longitude, atm.latitude],
      },
    }
  })

  return {
    type: 'FeatureCollection' as const,
    features,
  }
}

function buildHTML(
  atms: ATMWithDistance[],
  userLocation: LocationState,
  lockedIds?: Set<string>,
  isPremium?: boolean,
  isLoggedIn?: boolean
): string {
  const geojson = buildGeoJSON(atms, lockedIds, isPremium, isLoggedIn)

  const centerLng = userLocation?.longitude ?? 13.2894
  const centerLat = userLocation?.latitude ?? -8.8399

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css" rel="stylesheet"/>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"></script>
<style>
  * { margin:0; padding:0; }
  html, body, #map { width:100%; height:100%; overflow:hidden; }
</style>
</head>
<body>
<div id="map"></div>
<script>
mapboxgl.accessToken = '${MAPBOX_TOKEN}';

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [${centerLng}, ${centerLat}],
  zoom: 13,
  attributionControl: false
});

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

var geojsonData = ${JSON.stringify(geojson)};

map.on('load', function() {
  map.addSource('atms', {
    type: 'geojson',
    data: geojsonData,
    cluster: true,
    clusterMaxZoom: 16,
    clusterMinPoints: 2,
    clusterRadius: 50
  });

  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'atms',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#4285F4',
      'circle-radius': ['step', ['get', 'point_count'], 20, 5, 28, 15, 36],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff'
    }
  });

  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'atms',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 14
    },
    paint: {
      'text-color': '#ffffff'
    }
  });

  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'atms',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': 12,
      'circle-stroke-width': 0
    }
  });

  map.addLayer({
    id: 'unclustered-label',
    type: 'symbol',
    source: 'atms',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'text-field': ['get', 'bank_name'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 9,
      'text-offset': [0, 0],
      'text-allow-overlap': true
    },
    paint: {
      'text-color': '#ffffff'
    }
  });

  if (${userLocation ? 'true' : 'false'}) {
    var userEl = document.createElement('div');
    userEl.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 0 8px rgba(66,133,244,0.6);';
    new mapboxgl.Marker({ element: userEl })
      .setLngLat([${centerLng}, ${centerLat}])
      .addTo(map);
  }

  map.on('click', 'unclustered-point', function(e) {
    if (e.features && e.features.length > 0) {
      var props = e.features[0].properties;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'atmPress',
        atmId: props.id,
        atm: props
      }));
    }
  });

  map.on('click', 'clusters', function(e) {
    var features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    if (features && features.length > 0) {
      var clusterId = features[0].properties.cluster_id;
      var source = map.getSource('atms');
      source.getClusterExpansionZoom(clusterId, function(err, zoom) {
        if (!err) {
          map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
        }
      });
    }
  });

  map.on('mouseenter', 'clusters', function() { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'clusters', function() { map.getCanvas().style.cursor = ''; });
  map.on('mouseenter', 'unclustered-point', function() { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'unclustered-point', function() { map.getCanvas().style.cursor = ''; });
});

function updateData(newGeojson) {
  if (map.loaded()) {
    var source = map.getSource('atms');
    if (source) {
      source.setData(newGeojson);
    }
  }
}

function centerOn(lng, lat) {
  map.easeTo({ center: [lng, lat], zoom: 14, duration: 1000 });
}

window.addEventListener('message', function(e) {
  var data = JSON.parse(e.data);
  if (data.type === 'setATMs') {
    updateData(data.geojson);
  } else if (data.type === 'centerOnLocation') {
    centerOn(data.longitude, data.latitude);
  }
});
</script>
</body>
</html>`
}

export function MapboxWebView({ atms, userLocation, selectedATMId, onATMPress, lockedIds, isPremium, isLoggedIn }: MapboxWebViewProps) {
  const webRef = useRef<WebView>(null)

  const html = useMemo(() => buildHTML(atms, userLocation, lockedIds, isPremium, isLoggedIn), [atms, userLocation, lockedIds, isPremium, isLoggedIn])
  const geojson = useMemo(() => buildGeoJSON(atms, lockedIds, isPremium, isLoggedIn), [atms, lockedIds, isPremium, isLoggedIn])

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data)
        if (data.type === 'atmPress') {
          const atm = atms.find((a) => a.id === data.atmId)
          if (atm) onATMPress(atm)
        }
      } catch {}
    },
    [atms, onATMPress]
  )

  const syncData = useCallback(() => {
    webRef.current?.injectJavaScript(`window.updateData && window.updateData(${JSON.stringify(geojson)}); true;`)
  }, [geojson])

  useEffect(() => {
    syncData()
  }, [syncData])

  useEffect(() => {
    if (userLocation) {
      webRef.current?.injectJavaScript(
        `window.centerOn && window.centerOn(${userLocation.longitude}, ${userLocation.latitude}); true;`
      )
    }
  }, [userLocation])

  return (
    <WebView
      ref={webRef}
      source={{ html }}
      style={{ flex: 1 }}
      onMessage={handleMessage}
      onLoad={syncData}
      onError={(event) => console.warn('Map WebView error:', event.nativeEvent.description)}
      javaScriptEnabled
      originWhitelist={['*']}
      cacheEnabled={false}
    />
  )
}
