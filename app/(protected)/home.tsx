import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Protected Home</Text>
      <Text style={styles.text}>You are logged in.</Text>
      <Text style={styles.text}>{user?.displayName ?? "Unknown User"}</Text>
      <Text style={styles.text}>
        {user?.mail ?? user?.userPrincipalName ?? ""}
      </Text>

      <Pressable
        style={styles.button}
        onPress={async () => {
          await signOut();
          router.replace("/");
        }}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  text: {
    color: "white",
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "black",
    fontWeight: "600",
  },
});
