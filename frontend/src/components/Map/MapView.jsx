import React, { useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ScatterplotLayer, TextLayer, ArcLayer } from '@deck.gl/layers';
import { MAP_COLORS, MAP_CONFIG } from '../../config/firebase';
import './MapView.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const INITIAL_VIEW_STATE = {
  longitude: MAP_CONFIG.center.lng,
  latitude: MAP_CONFIG.center.lat,
  zoom: MAP_CONFIG.zoom - 0.5,
  pitch: 45,
  bearing: 0
};

export default function MapView({ nodes = [], routes = [], anomalies = [], onNodeClick }) {
  
  const getNodeColor = (status) => {
    switch (status) {
      case 'DISRUPTED': return MAP_COLORS.nodeDisrupted;
      case 'DELAYED': return MAP_COLORS.nodeDelayed;
      default: return MAP_COLORS.nodeNormal;
    }
  };

  const getArcColor = (route) => {
    if (route.isRerouted) return MAP_COLORS.arcRerouted;
    if (route.status === 'DISRUPTED') return MAP_COLORS.arcDisrupted;
    return MAP_COLORS.arcNormal;
  };

  const layers = useMemo(() => {
    const nodeLayer = new ScatterplotLayer({
      id: 'nodes-layer',
      data: nodes,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 1000,
      radiusMinPixels: 4,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 2,
      getPosition: d => [d.lng, d.lat],
      getFillColor: d => getNodeColor(d.status),
      getLineColor: d => [255, 255, 255, 255],
      getRadius: d => d.status === 'DISRUPTED' ? 30 : 15 + (d.utilization || 0) * 10,
      onClick: (info) => { if (info.object) onNodeClick?.(info.object); },
      autoHighlight: true,
      highlightColor: [255, 255, 255, 100],
      updateTriggers: {
        getFillColor: d => d.status,
        getRadius: d => [d.status, d.utilization]
      }
    });

    const routeLayer = new ArcLayer({
      id: 'routes-layer',
      data: routes,
      pickable: true,
      getWidth: d => d.isRerouted ? 3 : 2,
      getSourcePosition: d => d.originCoordinates,
      getTargetPosition: d => d.destinationCoordinates,
      getSourceColor: d => getArcColor(d),
      getTargetColor: d => getArcColor(d),
      autoHighlight: true,
      highlightColor: [255, 255, 255, 100],
      getHeight: d => d.isRerouted ? 0.8 : 0.5,
      updateTriggers: {
        getSourceColor: d => [d.status, d.isRerouted],
        getTargetColor: d => [d.status, d.isRerouted],
      }
    });
    
    // Truck markers (current positions) plotted as simple dots
    const truckLayer = new ScatterplotLayer({
      id: 'trucks-layer',
      data: routes.filter(r => r.currentPosition),
      pickable: false,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 1000,
      radiusMinPixels: 4,
      radiusMaxPixels: 8,
      lineWidthMinPixels: 1,
      getPosition: d => d.currentPosition,
      getFillColor: d => getArcColor(d),
      getLineColor: [255, 255, 255],
      getRadius: 8,
    });

    const anomalyLayer = new ScatterplotLayer({
      id: 'anomaly-layer',
      data: anomalies,
      pickable: true,
      opacity: 0.6,
      stroked: true,
      filled: true,
      radiusScale: 1000,
      radiusMinPixels: 15,
      radiusMaxPixels: 45,
      lineWidthMinPixels: 4,
      getPosition: d => [d.lng, d.lat],
      getFillColor: d => [239, 68, 68, 120],
      getLineColor: d => [239, 68, 68, 255],
      getRadius: 40,
    });

    const labelLayer = new TextLayer({
      id: 'labels-layer',
      data: nodes,
      pickable: false,
      getPosition: d => [d.lng, d.lat],
      getText: d => d.name,
      getSize: 12,
      getColor: d => [71, 85, 105, 255],
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'top',
      getPixelOffset: [0, 15],
      background: true,
      backgroundPadding: [4, 2],
      getBackgroundColor: [255, 255, 255, 230],
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
    });

    const anomalyLabelLayer = new TextLayer({
      id: 'anomaly-labels-layer',
      data: anomalies,
      pickable: false,
      getPosition: d => [d.lng, d.lat],
      getText: d => `⚠ ${d.type?.replace(/_/g, ' ')}`,
      getSize: 14,
      getColor: d => [220, 38, 38, 255],
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      getPixelOffset: [0, -25],
      fontWeight: 'bold',
      background: true,
      backgroundPadding: [6, 4],
      getBackgroundColor: [255, 228, 230, 230],
    });

    return [routeLayer, truckLayer, nodeLayer, anomalyLayer, labelLayer, anomalyLabelLayer];
  }, [nodes, routes, anomalies, onNodeClick]);

  return (
    <div className="map-container relative w-full h-full">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getTooltip={(info) => {
          if (!info.object) return null;
          const { layer, object: d } = info;
          if (layer.id === 'nodes-layer') {
            return {
              html: `<b>${d.name}</b><br/>Type: ${d.type?.replace(/_/g, ' ')}<br/>Status: ${d.status}<br/>Queue: ${d.queueLength} trucks`,
              style: { backgroundColor: '#fff', color: '#1E293B', fontSize: '13px', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
            };
          }
          if (layer.id === 'routes-layer') {
            return {
              html: `<b>Vehicle: ${d.vehicleRegNo}</b><br/>Status: ${d.isRerouted ? 'REROUTED' : d.status}<br/>Risk: ${(d.riskScore * 100).toFixed(0)}%<br/>Origin: ${d.origin}<br/>Dest: ${d.destination}`,
              style: { backgroundColor: '#fff', color: '#1E293B', fontSize: '13px', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
            };
          }
          if (layer.id === 'anomaly-layer') {
            return {
              html: `<b>${d.type?.replace(/_/g, ' ')}</b><br/>Severity: ${(d.severity * 100).toFixed(0)}%<br/>Impact: ${d.affectedHighway}`,
              style: { backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '13px', padding: '10px', borderRadius: '6px', border: '1px solid #FECACA', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
            };
          }
          return null;
        }}
      >
        <Map
          mapLib={maplibregl}
          mapStyle={MAP_STYLE}
          reuseMaps
          preventStyleDiffing={true}
        />
      </DeckGL>

      <div className="map-watermark" style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 10, fontSize: '11px', color: '#64748B', fontWeight: 600, background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: '4px' }}>
        A.P.E.X Digital Twin · Powered by Deck.gl & Maplibre
      </div>
    </div>
  );
}
