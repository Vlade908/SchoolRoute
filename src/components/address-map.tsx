
'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';


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
  onAddressSelect?: (address: string, position?: { lat: number; lng: number }) => void;
  initialAddress?: string;
}

function MapComponent({ onAddressSelect, initialAddress }: AddressMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'br' },
    },
    debounce: 300,
  });

  useEffect(() => {
    if (initialAddress) {
      setValue(initialAddress, false);
      getGeocode({ address: initialAddress }).then((results) => {
        const { lat, lng } = getLatLng(results[0]);
        const pos = { lat, lng };
        setCenter(pos);
        setMarkerPosition(pos);
        if (map) {
          map.panTo(pos);
          map.setZoom(15);
        }
      });
    }
  }, [initialAddress, map, setValue]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleSelect = ({ description }: { description: string }) => async () => {
    setValue(description, false);
    clearSuggestions();
    inputRef.current?.blur();

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      const newPos = { lat, lng };

      setMarkerPosition(newPos);
      setCenter(newPos);
      map?.panTo(newPos);
      map?.setZoom(15);
      
      if (onAddressSelect) {
        onAddressSelect(description, newPos);
      }
    } catch (error) {
      console.log('😱 Error geocoding: ', error);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (onAddressSelect) {
      onAddressSelect(e.target.value);
    }
  }

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(newPos);
      
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: newPos }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const formattedAddress = results[0].formatted_address;
          setValue(formattedAddress, false);
           if (onAddressSelect) {
              onAddressSelect(formattedAddress, newPos);
           }
        }
      });
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id="address"
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          placeholder="Busque o endereço"
          autoComplete="off"
        />
        {status === 'OK' && (
          <div className="absolute top-full mt-1.5 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="p-1">
              {data.map((suggestion) => {
                 const {
                  place_id,
                  structured_formatting: { main_text, secondary_text },
                } = suggestion;

                return (
                   <div
                    key={place_id}
                    onClick={handleSelect(suggestion)}
                    className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{main_text}</p>
                      <p className="text-xs text-muted-foreground">{secondary_text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

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

export function AddressMap(props: AddressMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  if (loadError) return <div>Erro ao carregar o mapa. Verifique a chave de API.</div>;
  if (!isLoaded) return <Skeleton className="w-full h-[300px]" />;

  return <MapComponent {...props} />;
}
