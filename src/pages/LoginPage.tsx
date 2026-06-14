import { useEffect, useRef, useState } from "react";
import { loginWithGoogle, type AuthUserResponse } from "../api/authApi";
import { recordAuthEvent } from "../debug/debugInfo";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

type Props = {
  onLogin: (authUser: AuthUserResponse) => void;
  notice?: string;
};

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function LoginPage({ onLogin, notice }: Props) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!googleClientId || !buttonRef.current) {
      if (!googleClientId) recordAuthEvent("google-config", "Google Client ID fehlt.");
      return;
    }

    const clientId = googleClientId;
    let cancelled = false;

    function renderGoogleButton() {
      if (cancelled || !buttonRef.current || !window.google) return;
      recordAuthEvent("google-render", "Google Button wird gerendert.");

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          recordAuthEvent("google-callback", response.credential ? "Credential erhalten." : "Credential fehlt.");
          if (!response.credential) {
            setError("Google hat kein gültiges Login-Token geliefert.");
            return;
          }

          try {
            setLoading(true);
            setError("");
            recordAuthEvent("backend-login", "Google Credential wird an Backend gesendet.");
            const authUser = await loginWithGoogle(response.credential);
            recordAuthEvent("backend-login", "Backend-Login erfolgreich.");
            onLogin(authUser);
          } catch (err) {
            const message = err instanceof Error ? err.message : "Google Login fehlgeschlagen.";
            recordAuthEvent("backend-login-error", message);
            setError(message);
          } finally {
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 280,
      });
    }

    if (window.google) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    script.onerror = () => {
      recordAuthEvent("google-script-error", "Google Login Script konnte nicht geladen werden.");
      setError("Google Login konnte nicht geladen werden.");
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [onLogin]);

  return (
    <main className="login-page">
      <section className="login-card">
        <span className="nav-brand-mark">TMM</span>
        <h1>Tabletop Matchmaker</h1>
        <p>Bitte melde dich mit deinem Google-Konto an, um die geschlossene Testphase zu nutzen.</p>
        {notice && <p className="login-error">{notice}</p>}

        {!googleClientId ? (
          <p className="login-error">Google Login ist noch nicht konfiguriert.</p>
        ) : (
          <div className="google-login-slot" ref={buttonRef} aria-busy={loading} />
        )}

        {loading && <small>Login wird geprüft...</small>}
        {error && <p className="login-error">{error}</p>}
      </section>
    </main>
  );
}
