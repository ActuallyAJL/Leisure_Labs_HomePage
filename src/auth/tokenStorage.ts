import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_KEY = "ms_auth";

export async function getStoredAuth(): Promise<string | null> {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(AUTH_KEY);
  }
  return SecureStore.getItemAsync(AUTH_KEY);
}

export async function setStoredAuth(value: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(AUTH_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(AUTH_KEY, value);
}

export async function deleteStoredAuth(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(AUTH_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_KEY);
}
