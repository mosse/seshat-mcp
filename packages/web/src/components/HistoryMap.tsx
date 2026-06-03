'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface HistoryMapProps {
  /** GeoJSON FeatureCollection of polity borders */
  geojson?: GeoJSON.FeatureCollection;
  /** Center coordinates [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Year to display (filters Cliopatria by FromYear/ToYear) */
  year?: number;
  /** CSS class for the container */
  className?: string;
}

export function HistoryMap({
  geojson,
  center = [30, 30],
  zoom = 3,
  year,
  className = 'map-shell w-full h-96 rounded-xl overflow-hidden border border-rule',
}: HistoryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center,
        zoom,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      mapRef.current = map;

      map.on('load', () => {
        if (geojson && geojson.features.length > 0) {
          // Filter features by year if specified
          const filtered = year
            ? {
                ...geojson,
                features: geojson.features.filter((f) => {
                  const from = f.properties?.FromYear ?? f.properties?.year_from;
                  const to = f.properties?.ToYear ?? f.properties?.year_to;
                  return from <= year && to >= year;
                }),
              }
            : geojson;

          map.addSource('polity-borders', {
            type: 'geojson',
            data: filtered,
          });

          map.addLayer({
            id: 'polity-fill',
            type: 'fill',
            source: 'polity-borders',
            paint: {
              'fill-color': '#2563eb',
              'fill-opacity': 0.2,
            },
          });

          map.addLayer({
            id: 'polity-outline',
            type: 'line',
            source: 'polity-borders',
            paint: {
              'line-color': '#2563eb',
              'line-width': 1.5,
            },
          });
        }
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch {
      setMapError(true);
    }
  }, [center, zoom, geojson, year]);

  if (mapError) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-ink-850`}
      >
        <p className="text-sm text-parchment-faint">
          Map could not be loaded. Results are still available above.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label="Historical territory map showing polity borders for the selected year"
    />
  );
}
