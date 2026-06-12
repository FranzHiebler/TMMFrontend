import { Link } from "react-router-dom";

export default function AdminOverviewPage() {
  return (
    <main className="page admin-page">
      <header className="page-header page-header-stack">
        <h1>Admin Übersicht</h1>
        <p className="page-subtitle">Systemverwaltung, Feedback und Testansichten für die geschlossene Testphase.</p>
      </header>

      <div className="admin-link-grid">
        <Link to="/admin/systems" className="admin-link-card">
          <b>Systeme verwalten</b>
          <span>Spielsysteme, Kategorien und Markerfarben bearbeiten.</span>
        </Link>
        <Link to="/admin/feedback" className="admin-link-card">
          <b>Feedback</b>
          <span>Tester-Feedback sichten, priorisieren und kommentieren.</span>
        </Link>
        <Link to="/admin/test-users" className="admin-link-card">
          <b>Testansichten</b>
          <span>Die App als Dev-User ansehen, ohne echte Nutzer zu impersonaten.</span>
        </Link>
      </div>
    </main>
  );
}
