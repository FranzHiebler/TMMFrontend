import { useState } from "react";
import {
  addDateOption,
  closeGame,
  inviteFriendToSession,
  joinWaitlist,
  promoteWaitlist,
  respondInvitation,
  selectDateOption,
  voteDateOption,
} from "../api/gamesApi";
import { getFriends } from "../api/friendsApi";
import { useUser } from "../context/UserContext";
import type { FriendDto, GameResponse, GameResultKind } from "../types/game";

type Props = {
  game: GameResponse;
  onGameUpdated: (game: GameResponse) => void;
};

export default function SessionPlanningPanel({ game, onGameUpdated }: Props) {
  const user = useUser();
  const [dateValue, setDateValue] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [friendId, setFriendId] = useState("");
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [resultKind, setResultKind] = useState<GameResultKind>("FreeText");
  const [resultValue, setResultValue] = useState("");
  const [resultNotes, setResultNotes] = useState("");
  const [message, setMessage] = useState("");
  const isHost = game.host.userId === user.userId;
  const myInvitation = game.invitations?.find((invitation) => invitation.user.userId === user.userId && invitation.status === "Pending");

  async function refreshFriends() {
    const next = await getFriends(user);
    setFriends(next);
    setFriendId((current) => current || next[0]?.userId || "");
  }

  async function addOption() {
    const updated = await addDateOption(game.id, { startTimeUtc: new Date(dateValue).toISOString(), label: dateLabel || null }, user);
    setDateValue("");
    setDateLabel("");
    onGameUpdated(updated);
  }

  async function invite() {
    const friend = friends.find((candidate) => candidate.userId === friendId);
    if (!friend) return;
    const updated = await inviteFriendToSession(game.id, { userId: friend.userId, displayName: friend.displayName }, user);
    setMessage("Einladung gesendet.");
    onGameUpdated(updated);
  }

  async function closeWithResult() {
    const updated = await closeGame(game.id, { kind: resultKind, value: resultValue, notes: resultNotes || null }, user);
    setMessage("Session abgeschlossen.");
    onGameUpdated(updated);
  }

  const publicUrl = `${window.location.origin}/public/sessions/${game.publicSlug || game.id}`;
  const ogUrl = `${window.location.origin.replace(":5173", ":7173")}/s/${game.publicSlug || game.id}`;

  return (
    <section className="card session-planning-panel">
      <h2>Planung</h2>
      {message && <p className="message message-success">{message}</p>}
      <p className="muted">
        Termin: {game.timingMode === "Open" ? "offen" : game.timeLabel || new Date(game.startTimeUtc).toLocaleString("de-DE")}
      </p>

      <div className="button-row">
        <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)}>Öffentlichen Link kopieren</button>
        <a href={ogUrl} target="_blank" rel="noreferrer">OG-Vorschau</a>
      </div>

      {myInvitation && (
        <div className="inline-panel">
          <b>Du bist eingeladen.</b>
          <button type="button" onClick={async () => onGameUpdated(await respondInvitation(game.id, myInvitation.id, true, user))}>Annehmen</button>
          <button type="button" onClick={async () => onGameUpdated(await respondInvitation(game.id, myInvitation.id, false, user))}>Ablehnen</button>
        </div>
      )}

      <details>
        <summary>Terminabstimmung</summary>
        {isHost && (
          <div className="form-row-2">
            <input type="datetime-local" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
            <input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="z.B. Freitag Abend" />
            <button type="button" disabled={!dateValue} onClick={addOption}>Vorschlagen</button>
          </div>
        )}
        {game.dateOptions?.map((option) => (
          <div key={option.id} className="list-row">
            <b>{new Date(option.startTimeUtc).toLocaleString("de-DE")}</b>
            <span>{option.label || "Termin"} · {option.votes.length} Stimmen</span>
            <button type="button" onClick={async () => onGameUpdated(await voteDateOption(game.id, option.id, user))}>Stimme</button>
            {isHost && <button type="button" onClick={async () => onGameUpdated(await selectDateOption(game.id, option.id, user))}>Übernehmen</button>}
          </div>
        ))}
      </details>

      <details>
        <summary>Einladungen</summary>
        {isHost && (
          <div className="button-row">
            <button type="button" onClick={refreshFriends}>Freunde laden</button>
            <select value={friendId} onChange={(e) => setFriendId(e.target.value)}>
              {friends.map((friend) => <option key={friend.userId} value={friend.userId}>{friend.displayName}</option>)}
            </select>
            <button type="button" disabled={!friendId} onClick={invite}>Einladen</button>
          </div>
        )}
        {game.invitations?.map((invitation) => (
          <div key={invitation.id} className="list-row">
            <b>{invitation.user.displayName}</b>
            <span>{invitation.status}</span>
          </div>
        ))}
      </details>

      <details>
        <summary>Warteliste</summary>
        <div className="button-row">
          <input value={waitlistMessage} onChange={(e) => setWaitlistMessage(e.target.value)} placeholder="Nachricht optional" />
          <button type="button" onClick={async () => onGameUpdated(await joinWaitlist(game.id, { message: waitlistMessage || null }, user))}>Auf Warteliste</button>
        </div>
        {game.waitlist?.map((entry) => (
          <div key={entry.id} className="list-row">
            <b>{entry.player.displayName}</b>
            <span>{entry.message}</span>
            {isHost && game.tables[0] && (
              <button type="button" onClick={async () => onGameUpdated(await promoteWaitlist(game.id, entry.id, game.tables[0].id, user))}>
                Nachrücken
              </button>
            )}
          </div>
        ))}
      </details>

      {isHost && (
        <details>
          <summary>Session abschließen</summary>
          <div className="form-row-2">
            <select value={resultKind} onChange={(e) => setResultKind(e.target.value as GameResultKind)}>
              <option value="Matrix20">20er Matrix</option>
              <option value="Matrix6">6er Matrix</option>
              <option value="Score">Punktestand</option>
              <option value="FreeText">Freitext</option>
            </select>
            <input value={resultValue} onChange={(e) => setResultValue(e.target.value)} placeholder="z.B. 15:5" />
            <input value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} placeholder="Notiz optional" />
            <button type="button" disabled={!resultValue} onClick={closeWithResult}>Abschließen</button>
          </div>
        </details>
      )}
    </section>
  );
}
