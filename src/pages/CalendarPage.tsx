import { Navigate } from "react-router-dom";

export default function CalendarPage() {
  return <Navigate to="/my-games?view=calendar" replace />;
}
