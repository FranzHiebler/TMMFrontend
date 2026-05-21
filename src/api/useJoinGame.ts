import { useEffect, useState } from "react";
import { applyToGame, getGameById, joinTable } from "./gamesApi";
import type { GameResponse } from "../types/game";
import { GameJoinMode } from "../types/game";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";

type UseJoinGameOptions = {
  onJoined?: (gameId: string, tableId: string, systemKey?: string) => void;
  onApplied?: (gameId: string, tableId: string, systemKey?: string) => void;
  onGameUpdated?: (game: GameResponse) => void;
};

export function useJoinGame(options: UseJoinGameOptions = {}) {
  const [joiningKey, setJoiningKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [messageByKey, setMessageByKey] = useState<Record<string, string>>({});
  const user = useUser();
  const { showToast } = useToast();

  useEffect(() => {
    if (!errorMessage && !successMessage) return;

    const timeout = window.setTimeout(() => {
      setErrorMessage("");
      setSuccessMessage("");
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [errorMessage, successMessage]);

  async function join(
    gameId: string,
    tableId: string,
    joinMode: GameJoinMode,
    systemKey?: string
  ) {
    const key = `${gameId}_${tableId}`;

    try {
      setErrorMessage("");
      setSuccessMessage("");
      setJoiningKey(key);
      setMessageByKey((prev) => ({ ...prev, [key]: "" }));

      if (joinMode === GameJoinMode.FirstComeFirstServe) {
        await joinTable(gameId, tableId, { systemKey: systemKey || null }, user);

        const updatedGame = await getGameById(gameId);
        options.onGameUpdated?.(updatedGame);

        setMessageByKey((prev) => ({
          ...prev,
          [key]: "Erfolgreich beigetreten",
        }));

        setSuccessMessage("Erfolgreich beigetreten");
        showToast("success", "Erfolgreich beigetreten");
      } else {
        await applyToGame(gameId, { tableId, systemKey: systemKey || null }, user);

        const updatedGame = await getGameById(gameId);
        options.onGameUpdated?.(updatedGame);

        setMessageByKey((prev) => ({
          ...prev,
          [key]: "Bewerbung gesendet",
        }));

        setSuccessMessage("Bewerbung gesendet");
        showToast("success", "Bewerbung gesendet");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Aktion fehlgeschlagen";
      setErrorMessage(message);
      showToast("error", message);
      setMessageByKey((prev) => ({
        ...prev,
        [key]: message,
      }));
    } finally {
      setJoiningKey(null);
    }
  }

  return { join, joiningKey, errorMessage, successMessage, messageByKey };
}
