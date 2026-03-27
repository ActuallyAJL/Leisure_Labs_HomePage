import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { deleteStoredAuth, getStoredAuth, setStoredAuth } from "./tokenStorage";

if (Platform.OS === "web" && typeof window !== "undefined") {
  WebBrowser.maybeCompleteAuthSession();
}

const CLIENT_ID = "cad8dcad-1113-4c1c-9548-d9702abb87dd";
const TENANT = "common";

const discovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
};

type StoredAuth = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  issuedAt: number;
};

export type GraphMe = {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
  mail?: string;
};

type AuthContextValue = {
  user: GraphMe | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getRedirectUri() {
  return Platform.OS === "web"
    ? "http://localhost:8081/auth"
    : AuthSession.makeRedirectUri({
        scheme: "leisurelabshomepage",
        path: "auth",
      });
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GraphMe | null>(null);
  const [loading, setLoading] = useState(true);

  const redirectUri = useMemo(() => getRedirectUri(), []);

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

  const restoreSession = useCallback(async () => {
    try {
      const raw = await getStoredAuth();
      if (!raw) {
        setUser(null);
        return;
      }

      const auth = JSON.parse(raw) as StoredAuth;
      const me = await fetchGraphMe(auth.accessToken);
      setUser(me);
    } catch {
      await deleteStoredAuth();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession().catch((err) => {
      console.error("restoreSession failed", err);
      setLoading(false);
    });
  }, [restoreSession]);

  useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type !== "success") return;
      if (!request?.codeVerifier) return;

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

        const me = await fetchGraphMe(tokenResult.accessToken);
        setUser(me);
      } catch (err) {
        console.error("handleAuthResponse failed", err);
        await deleteStoredAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    handleAuthResponse().catch((err) => {
      console.error("auth effect failed", err);
      setLoading(false);
    });
  }, [request, response, redirectUri]);

  const signIn = useCallback(async () => {
    if (!request) return;
    await promptAsync();
  }, [promptAsync, request]);

  const signOut = useCallback(async () => {
    await deleteStoredAuth();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      signIn,
      signOut,
    }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
