import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const AUTH_KEY = "ms_auth";

async function getStoredAuth(): Promise<string | null> {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(AUTH_KEY);
  }
  return await SecureStore.getItemAsync(AUTH_KEY);
}

async function setStoredAuth(value: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(AUTH_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(AUTH_KEY, value);
}

async function deleteStoredAuth(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(AUTH_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_KEY);
}

const maybeResult = WebBrowser.maybeCompleteAuthSession();
console.log("maybeCompleteAuthSession:", maybeResult);

const CLIENT_ID = "cad8dcad-1113-4c1c-9548-d9702abb87dd";
const TENANT = "common";

const discovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
};

type GraphMe = {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
  mail?: string;
};

type StoredAuth = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  issuedAt: number;
};

export default function Index() {
  const [profile, setProfile] = useState<GraphMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [authData, setAuthData] = useState<StoredAuth | null>(null);

  const redirectUri = useMemo(
    () =>
      Platform.OS === "web"
        ? "http://localhost:8081/auth"
        : AuthSession.makeRedirectUri({
            scheme: "leisurelabshomepage",
            path: "auth",
            preferLocalhost: true,
          }),
    [],
  );

  console.log("redirectUri:", redirectUri);
  console.log(
    "window.location.origin:",
    Platform.OS === "web" ? window.location.origin : "native",
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      scopes: ["openid", "profile", "email", "offline_access", "User.Read"],
    },
    discovery,
  );

  useEffect(() => {
    loadStoredSession().catch((err) => {
      console.error("loadStoredSession failed", err);
    });
  }, []);

  useEffect(() => {
    handleAuthResponse().catch((err) => {
      console.error(err);
      Alert.alert(
        "Login failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    });
  }, [response]);

  async function loadStoredSession() {
    const raw = await getStoredAuth();
    if (!raw) return;

    const saved: StoredAuth = JSON.parse(raw);
    setAuthData(saved);

    try {
      const me = await fetchGraphMe(saved.accessToken);
      setProfile(me);
    } catch {
      // Token might be expired; user can sign in again.
      await deleteStoredAuth();
      setAuthData(null);
      setProfile(null);
    }
  }

  async function handleAuthResponse() {
    if (response?.type !== "success") return;
    if (!request?.codeVerifier) {
      throw new Error("Missing PKCE code verifier.");
    }

    setLoading(true);
    try {
      const code = response.params.code;
      if (!code) {
        throw new Error("No authorization code returned.");
      }

      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: CLIENT_ID,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        },
        discovery,
      );

      if (!tokenResult.accessToken) {
        throw new Error("No access token returned.");
      }

      const stored: StoredAuth = {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresIn: tokenResult.expiresIn,
        issuedAt: Date.now(),
      };

      await setStoredAuth(JSON.stringify(stored));
      setAuthData(stored);

      const me = await fetchGraphMe(tokenResult.accessToken);
      setProfile(me);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGraphMe(accessToken: string): Promise<GraphMe> {
    const res = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Graph /me failed: ${res.status} ${text}`);
    }

    return (await res.json()) as GraphMe;
  }

  async function signIn() {
    await promptAsync();
  }

  async function signOut() {
    await deleteStoredAuth();
    setAuthData(null);
    setProfile(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Microsoft Graph Login</Text>

        <Text style={styles.subtitle}>
          Sign in with your Microsoft account and read your Graph profile.
        </Text>

        {loading && <ActivityIndicator />}

        {!profile ? (
          <Button
            title="Sign in with Microsoft"
            onPress={signIn}
            disabled={!request || loading}
          />
        ) : (
          <>
            <Text style={styles.label}>Signed in</Text>
            <Text style={styles.value}>
              Name: {profile.displayName ?? "Unknown"}
            </Text>
            <Text style={styles.value}>
              Email: {profile.mail ?? profile.userPrincipalName ?? "Unknown"}
            </Text>
            <Text style={styles.value}>Graph ID: {profile.id}</Text>

            <View style={styles.spacer} />
            <Button title="Sign out" onPress={signOut} />
          </>
        )}

        <View style={styles.spacer} />
        <Text style={styles.small}>Redirect URI: {redirectUri}</Text>
        <Text style={styles.small}>
          {authData ? "Token stored securely on device." : "No stored session."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
  },
  small: {
    fontSize: 12,
    color: "#555",
  },
  spacer: {
    height: 8,
  },
});
