type MessageType = "success" | "error" | "info";

type Props = {
  text?: string;
  type?: MessageType;
};

export default function Message({ text, type = "info" }: Props) {
  if (!text) return null;

  return (
    <div className={`message message-${type}`}>
      {text}
    </div>
  );
}