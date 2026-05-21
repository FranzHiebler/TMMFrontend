import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useEffect } from "react";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
};

function ClickHandler({ latitude, longitude, onChange }: Props) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return latitude != null && longitude != null ? (
    <Marker position={[latitude, longitude]} />
  ) : null;
}

function FlyToLocation({ latitude, longitude }: Pick<Props, "latitude" | "longitude">) {
  const map = useMap();

  useEffect(() => {
    if (latitude != null && longitude != null) {
      map.setView([latitude, longitude], 14);
    }
  }, [latitude, longitude, map]);

  return null;
}

export default function LocationPicker({ latitude, longitude, onChange }: Props) {
  const position: LatLngExpression = [
    latitude ?? 50.5558,
    longitude ?? 9.6808,
  ];

  return (
    <div style={{ height: 300, marginTop: 12 }}>
      <MapContainer center={position} zoom={12} style={{ height: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler latitude={latitude} longitude={longitude} onChange={onChange} />
        <FlyToLocation latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  );
}
