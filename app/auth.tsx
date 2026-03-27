import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function AuthCallbackScreen() {
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
