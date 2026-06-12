import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { stopImpersonation } from "./api/adminApi";
import { getCurrentUserPermissions } from "./api/usersApi";
import FeedbackBar from "./components/FeedbackBar";
import NotificationBell from "./components/NotificationBell";
import UserSwitcher from "./components/UserSwitcher";
import AdminFeedbackPage from "./pages/AdminFeedbackPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminTestUsersPage from "./pages/AdminTestUsersPage";
import CalendarPage from "./pages/CalendarPage";
import CreateGamePage from "./pages/CreateGamePage";
import DatenschutzPage from "./pages/DatenschutzPage";
import DirectMessagesPage from "./pages/DirectMessagesPage";
import EventSeriesPage from "./pages/EventSeriesPage";
import FriendsPage from "./pages/FriendsPage";
import GamesPage from "./pages/GamesPage";
import ImpressumPage from "./pages/ImpressumPage";
import LocationsPage from "./pages/LocationPage";
import MapDiscoveryPage from "./pages/MapDiscoveryPage";
import MyGamesPage from "./pages/MyGamesPage";
import NearbyPage from "./pages/NearbyPage";
import PlayRequestsPage from "./pages/PlayRequestsPage";
import ProfilePage from "./pages/ProfilePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import PublicSessionPage from "./pages/PublicSessionPage";
import SessionDetailPage from "./pages/SessionDetailPage";
import SystemsAdminPage from "./pages/SystemsAdminPage";
import { useUser } from "./context/UserContext";

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "app-tab active" : "app-tab";
}

export default function App() {
  const user = useUser();
  const location = useLocation();
  const showDevelopmentUserSwitcher = import.meta.env.DEV && user.availableUsers.length > 0;
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentUserPermissions(user)
      .then((permissions) => {
        if (!cancelled) setIsAdmin(permissions.isSystemAdmin || permissions.isAdmin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMenuOpen(false);
      setCreateOpen(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [location.pathname]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
      if (createRef.current && !createRef.current.contains(target)) setCreateOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  async function returnToSystemAdmin() {
    const authUser = await stopImpersonation();
    user.setUser({
      userId: authUser.userId,
      displayName: authUser.displayName,
      email: authUser.email,
      isSystemAdmin: authUser.isSystemAdmin,
      realUserIsSystemAdmin: authUser.realUserIsSystemAdmin,
      isDevUser: authUser.isDevUser,
      isImpersonating: authUser.isImpersonating,
      realUserId: authUser.realUserId,
      realDisplayName: authUser.realDisplayName,
      effectiveUserId: authUser.effectiveUserId,
      effectiveDisplayName: authUser.effectiveDisplayName,
    });
  }

  return (
    <>
      {user.isImpersonating && (
        <div className="impersonation-banner">
          <span>
            Du siehst die App als <b>{user.displayName}</b>
            {user.realDisplayName && <>. Angemeldet als {user.realDisplayName}</>}
          </span>
          <button type="button" onClick={() => void returnToSystemAdmin()}>
            Zu Systemadmin zurückkehren
          </button>
        </div>
      )}

      <nav className="app-top-nav">
        <Link className="nav-brand" to="/" aria-label="Zur Karte">
          <span className="nav-brand-mark">TMM</span>
          <span className="nav-brand-text">Tabletop Matchmaker</span>
        </Link>

        <div className="top-nav-actions" ref={menuRef}>
          <NotificationBell />

          <button
            type="button"
            className="hamburger-button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          {menuOpen && (
            <div className="hamburger-menu">
              <Link to="/locations">Meine Spielorte</Link>
              <Link to="/series">Regelmäßige Runden</Link>
              {isAdmin && (
                <>
                  <div className="nav-more-divider" />
                  <Link to="/admin">Admin Übersicht</Link>
                  <Link to="/admin/systems">Systeme verwalten</Link>
                  <Link to="/admin/feedback">Feedback</Link>
                  <Link to="/admin/test-users">Testansichten</Link>
                </>
              )}
              <Link to="/impressum">Impressum</Link>
              <Link to="/datenschutz">Datenschutz</Link>
              <div className="nav-more-divider" />
              <div className="auth-menu-panel">
                <b>{user.displayName}</b>
                {user.email && <small>{user.email}</small>}
                {user.isSystemAdmin && <span>Systemadmin</span>}
              </div>
              {showDevelopmentUserSwitcher && (
                <>
                  <div className="test-mode-panel">
                    <b>Testmodus</b>
                    <small>Development: Nutzerwechsel setzt nur die Dev-Header.</small>
                  </div>
                  <UserSwitcher />
                </>
              )}
              <button type="button" className="hamburger-menu-button" onClick={() => void user.logout()}>
                Abmelden
              </button>
            </div>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<MapDiscoveryPage />} />
        <Route path="/sessions/:gameId" element={<SessionDetailPage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/my-games" element={<MyGamesPage />} />
        <Route path="/nearby" element={<NearbyPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/games/create" element={<CreateGamePage />} />
        <Route path="/messages" element={<DirectMessagesPage />} />
        <Route path="/play-requests" element={<PlayRequestsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/series" element={<EventSeriesPage />} />
        <Route path="/public/sessions/:slugOrId" element={<PublicSessionPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/users/:userId" element={<PublicProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        {isAdmin && <Route path="/admin" element={<AdminOverviewPage />} />}
        {isAdmin && <Route path="/admin/test-users" element={<AdminTestUsersPage />} />}
        <Route path="/admin/feedback" element={<AdminFeedbackPage isAdmin={isAdmin} />} />
        {isAdmin && <Route path="/admin/systems" element={<SystemsAdminPage />} />}
      </Routes>

      <div className="app-bottom-stack">
        <div className="app-bottom-nav" ref={createRef}>
          <NavLink to="/my-games" className={navClass}>
            <span className="app-icon app-icon-home" aria-hidden="true" />
            Meine Spiele
          </NavLink>
          <NavLink to="/friends" className={navClass}>
            <span className="app-icon app-icon-friends" aria-hidden="true" />
            Freunde
          </NavLink>
          <NavLink to="/messages" className={navClass}>
            <span className="app-icon app-icon-inbox" aria-hidden="true" />
            Nachrichten
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            <span className="app-icon app-icon-profile" aria-hidden="true" />
            Profil
          </NavLink>

          <button
            type="button"
            className="app-tab app-tab-plus"
            aria-expanded={createOpen}
            aria-label={createOpen ? "Aktionsmenü schließen" : "Aktionsmenü öffnen"}
            onClick={() => setCreateOpen((open) => !open)}
          >
            +
          </button>

          {createOpen && (
            <>
              <button
                type="button"
                className="create-sheet-backdrop"
                aria-label="Aktionsmenü schließen"
                onClick={() => setCreateOpen(false)}
              />
              <div className="create-sheet" role="menu" aria-label="Neue Aktion">
                <Link to="/games/create" className="create-action-card" role="menuitem">
                  <span className="create-action-title">Spieltermin anbieten</span>
                  <span className="create-action-description">
                    Plane ein konkretes Spiel mit Ort, Tisch und freien Plätzen.
                  </span>
                </Link>
                <Link to="/play-requests" className="create-action-card" role="menuitem">
                  <span className="create-action-title">Spiel suchen</span>
                  <span className="create-action-description">
                    Erstelle ein Gesuch und lass andere dich finden.
                  </span>
                </Link>
                <Link to="/series" className="create-action-card" role="menuitem">
                  <span className="create-action-title">Regelmäßige Runde planen</span>
                  <span className="create-action-description">
                    Für Clubabende, Kampagnen oder feste Treffen.
                  </span>
                </Link>
              </div>
            </>
          )}
        </div>

        <FeedbackBar />
      </div>
    </>
  );
}
