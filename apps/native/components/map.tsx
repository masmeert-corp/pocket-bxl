import { AppleMaps, GoogleMaps, useLocationPermissions } from "expo-maps";
import { Text } from "heroui-native";
import { useEffect } from "react";
import { Platform } from "react-native";

export function Map() {
  const [permission, requestPermission] = useLocationPermissions();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const isMyLocationEnabled = permission?.granted ?? false;

  if (Platform.OS === "ios") {
    return <AppleMaps.View style={{ flex: 1 }} properties={{ isMyLocationEnabled }} />;
  } else if (Platform.OS === "android") {
    return <GoogleMaps.View style={{ flex: 1 }} properties={{ isMyLocationEnabled }} />;
  } else {
    return <Text>Maps are only available on Android and iOS</Text>;
  }
}
