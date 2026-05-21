type Props = {
  proposalStartTime: string;
  proposalSystems: string[];
  proposalCustomSystems: string;
  proposalPoints: string;
  proposalMessage: string;
  availableSystems: string[];
  isBusy: boolean;
  onProposalStartTimeChange: (value: string) => void;
  onToggleProposalSystem: (system: string) => void;
  onProposalCustomSystemsChange: (value: string) => void;
  onProposalPointsChange: (value: string) => void;
  onProposalMessageChange: (value: string) => void;
  onSubmit: () => void;
};

export default function GameProposalForm({
  proposalStartTime,
  proposalSystems,
  proposalCustomSystems,
  proposalPoints,
  proposalMessage,
  availableSystems,
  isBusy,
  onProposalStartTimeChange,
  onToggleProposalSystem,
  onProposalCustomSystemsChange,
  onProposalPointsChange,
  onProposalMessageChange,
  onSubmit,
}: Props) {
  return (
    <div className="proposal-form">
      <div className="field">
        <label>Neue Startzeit am Tisch</label>
        <input
          type="time"
          value={proposalStartTime}
          onChange={(e) => onProposalStartTimeChange(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Systeme</label>

        <div className="systems-checkboxes">
          <label>
            <input
              type="checkbox"
              checked={proposalSystems.includes("egal")}
              onChange={() => onToggleProposalSystem("egal")}
            />
            Egal
          </label>

          {availableSystems
            .filter((system) => system.toLowerCase() !== "egal")
            .map((system) => (
              <label key={system}>
                <input
                  type="checkbox"
                  checked={proposalSystems.includes(system)}
                  disabled={proposalSystems.includes("egal")}
                  onChange={() => onToggleProposalSystem(system)}
                />
                {system}
              </label>
            ))}
        </div>

        <input
          value={proposalCustomSystems}
          disabled={proposalSystems.includes("egal")}
          onChange={(e) => onProposalCustomSystemsChange(e.target.value)}
          placeholder="Weitere Systeme, z.B. tow, wh40k"
        />
      </div>

      <div className="field">
        <label>Punkte</label>
        <input
          type="number"
          min={0}
          value={proposalPoints}
          onChange={(e) => onProposalPointsChange(e.target.value)}
          placeholder="Punkte"
        />
      </div>

      <div className="field">
        <label>Nachricht</label>
        <textarea
          value={proposalMessage}
          onChange={(e) => onProposalMessageChange(e.target.value)}
          placeholder="Nachricht optional"
        />
      </div>

      <button type="button" disabled={isBusy} onClick={onSubmit}>
        Vorschlag senden
      </button>
    </div>
  );
}