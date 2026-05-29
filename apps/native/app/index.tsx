import { AppleMaps, GoogleMaps } from "expo-maps";
import { Text } from "heroui-native";
import { Platform } from "react-native";

export default function Home() {
  if (Platform.OS === "ios") {
    return <AppleMaps.View style={{ flex: 1 }} />;
  } else if (Platform.OS === "android") {
    return <GoogleMaps.View style={{ flex: 1 }} />;
  } else {
    return <Text>Maps are only available on Android and iOS</Text>;
  }
}
