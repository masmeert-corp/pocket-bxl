import { AppleMaps, GoogleMaps, useLocationPermissions } from "expo-maps";
import { Text } from "heroui-native";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Container } from "./container";

const HIDE_POI_STYLE = JSON.stringify([
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
]);

export function Map() {
  const [permission, requestPermission] = useLocationPermissions();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const isMyLocationEnabled = permission?.granted ?? false;

  switch (Platform.OS) {
    case "ios":
      return (
        <AppleMaps.View
          style={{ flex: 1 }}
          properties={{
            isMyLocationEnabled,
            pointsOfInterest: { including: [] },
          }}
        />
      );
    case "android":
      return (
        <GoogleMaps.View
          style={{ flex: 1 }}
          properties={{
            isMyLocationEnabled,
            mapStyleOptions: { json: HIDE_POI_STYLE },
          }}
        />
      );

    default:
      return (
        <Container>
          <Text>Maps are only available on Android and iOS</Text>
        </Container>
      );
  }
}
