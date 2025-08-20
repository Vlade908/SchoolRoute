
'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

const containerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: -14.235,
  lng: -51.9253
};

const libraries: ('places' | 'drawing' | 'geometry' | 'localContext' | 'visualization')[] = ['places'];

interface AddressMapProps {
  onAddressSelect?: (address: string, position: { lat: number; lng: number }) => void;
  initialAddress?: string;
}

export function AddressMap({ onAddressSelect, initialAddress }: AddressMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [address, setAddress] = useState(initialAddress || '');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (initialAddress) {
      // Se um endereço inicial é fornecido, tenta geocodificá-lo para centrar o mapa.
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: initialAddress }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const pos = { lat: location.lat(), lng: location.lng() };
          setCenter(pos);
          setMarkerPosition(pos);
          if (map) map.panTo(pos);
        }
      });
    }
  }, [initialAddress, map, isLoaded]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const location = place.geometry.location;
        const newPos = { lat: location.lat(), lng: location.lng() };
        setCenter(newPos);
        setMarkerPosition(newPos);
        map?.panTo(newPos);
        map?.setZoom(15);
        const formattedAddress = place.formatted_address || '';
        setAddress(formattedAddress);
        if (onAddressSelect) {
          onAddressSelect(formattedAddress, newPos);
        }
      }
    }
  };
  
  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(newPos);
      
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: newPos }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const formattedAddress = results[0].formatted_address;
          setAddress(formattedAddress);
           if (onAddressSelect) {
              onAddressSelect(formattedAddress, newPos);
           }
        }
      });
    }
  }


  if (loadError) return <div>Erro ao carregar o mapa. Verifique a chave de API.</div>;
  if (!isLoaded) return <Skeleton className="w-full h-[300px]" />;

  return (
    <div className="space-y-2">
      <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
        <Input
          type="text"
          id="address"
          placeholder="Busque o endereço"
          value={address}
          onChange={(e) => {
              setAddress(e.target.value);
              if(onAddressSelect && markerPosition) {
                  onAddressSelect(e.target.value, markerPosition)
              }
          }}
        />
      </Autocomplete>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={initialAddress ? 15 : 4}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onMapClick}
        options={{
            streetViewControl: false,
            mapTypeControl: false,
        }}
      >
        {markerPosition && <Marker position={markerPosition} />}
      </GoogleMap>
    </div>
  );
}
