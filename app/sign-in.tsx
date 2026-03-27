import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../src/auth/AuthProvider";

export default function SignInScreen() {
  const { signIn, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(protected)/home");
      return;
    }

    if (!loading && !isAuthenticated) {
      signIn().catch((err) => {
        console.error("signIn failed", err);
        router.replace("/");
      });
    }
  }, [loading, isAuthenticated, signIn]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="white" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
});
