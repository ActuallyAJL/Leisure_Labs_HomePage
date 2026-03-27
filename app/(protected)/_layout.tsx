import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";

export default function ProtectedLayout() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="white" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
});
