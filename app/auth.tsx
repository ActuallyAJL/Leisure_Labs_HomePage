import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Platform, Text, View } from "react-native";

export default function AuthCallback() {
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const result = WebBrowser.maybeCompleteAuthSession();
      console.log("auth callback maybeCompleteAuthSession:", result);
    }

    // Optional: send the user back somewhere visible after the popup closes
    // In popup mode this may never be seen, but it's harmless.
    const t = setTimeout(() => {
      router.replace("/");
    }, 300);

    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Completing sign-in...</Text>
    </View>
  );
}
