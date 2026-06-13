import { useEffect, useState } from "react";
import {
  clearLocalAppData,
  getDebugSnapshot,
  isDebugEnabled,
  subscribeDebugInfo,
} from "../debug/debugInfo";

type Props = {
  authStatus: string;
  userEmail?: string | null;
  displayName?: string | null;
};

export default function DebugPanel({ authStatus, userEmail, displayName }: Props) {
  const [enabled] = useState(() => isDebugEnabled());
  const [manualCopyText, setManualCopyText] = useState("");
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeDebugInfo(() => setVersion((value) => value + 1));
  }, [enabled]);

  const snapshot = getDebugSnapshot({ status: authStatus, userEmail, displayName });

  if (!enabled) return null;

  const serialized = JSON.stringify(snapshot, null, 2);

  async function copyDebugData() {
    try {
      await navigator.clipboard.writeText(serialized);
      setManualCopyText("Debug-Daten wurden kopiert.");
    } catch {
      setManualCopyText(serialized);
    }
  }

  function clearData() {
    clearLocalAppData();
    setManualCopyText("Lokale App-Daten wurden gelöscht. Bitte lade die Seite neu.");
  }

  return (
    <aside className="debug-panel" aria-label="Debug-Informationen">
      <details open>
        <summary>Debug</summary>
        <div className="debug-panel-content">
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{snapshot.authStatus}</dd>
            </div>
            <div>
              <dt>Browser</dt>
              <dd>
                {snapshot.browser.platform} · {snapshot.browser.browser}
                {snapshot.browser.inAppBrowser ? " · In-App" : ""}
              </dd>
            </div>
            <div>
              <dt>API</dt>
              <dd>{snapshot.apiBaseUrl}</dd>
            </div>
            <div>
              <dt>Letzter API-Fehler</dt>
              <dd>
                {snapshot.lastApiFailure
                  ? `${snapshot.lastApiFailure.method} ${snapshot.lastApiFailure.url} · ${snapshot.lastApiFailure.status ?? "network"}`
                  : "Keiner"}
              </dd>
            </div>
            <div>
              <dt>Letzter Auth-Status</dt>
              <dd>{snapshot.lastAuthEvent ? `${snapshot.lastAuthEvent.step}: ${snapshot.lastAuthEvent.message ?? ""}` : "Keiner"}</dd>
            </div>
          </dl>

          <div className="debug-actions">
            <button type="button" onClick={() => void copyDebugData()}>
              Debug-Daten kopieren
            </button>
            <button type="button" onClick={clearData}>
              Lokale App-Daten löschen
            </button>
          </div>

          {manualCopyText && (
            manualCopyText.startsWith("{") ? (
              <textarea readOnly value={manualCopyText} rows={8} aria-label="Debug-Daten zum Kopieren" />
            ) : (
              <small>{manualCopyText}</small>
            )
          )}
        </div>
      </details>
    </aside>
  );
}
