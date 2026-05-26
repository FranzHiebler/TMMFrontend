import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { getCurrentUserPermissions } from "./api/usersApi";
import NotificationBell from "./components/NotificationBell";
import UserSwitcher from "./components/UserSwitcher";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentUserPermissions(user)
      .then((permissions) => {
        if (!cancelled) setIsAdmin(permissions.isAdmin);
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

  return (
    <>
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
              <Link to="/calendar">Kalender</Link>
              <Link to="/locations">Meine Spielorte</Link>
              <Link to="/series">Serien verwalten</Link>
              <div className="nav-more-divider" />
              {isAdmin && <Link to="/admin/systems">Admin: Systeme verwalten</Link>}
              <div className="nav-more-divider" />
              <Link to="/impressum">Impressum</Link>
              <Link to="/datenschutz">Datenschutz</Link>
              <div className="nav-more-divider" />
              <div className="test-mode-panel">
                <b>Testmodus</b>
                <small>Geschlossene Testerphase: Nutzerwechsel setzt nur die Dev-Header.</small>
              </div>
              <UserSwitcher />
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
        {isAdmin && <Route path="/admin/systems" element={<SystemsAdminPage />} />}
      </Routes>

      <div className="app-bottom-nav" ref={createRef}>
        <NavLink to="/my-games" className={navClass}>
          <span className="app-icon app-icon-home" aria-hidden="true" />
          Meine
        </NavLink>
        <NavLink to="/friends" className={navClass}>
          <span className="app-icon app-icon-friends" aria-hidden="true" />
          Freunde
        </NavLink>
        <NavLink to="/messages" className={navClass}>
          <span className="app-icon app-icon-inbox" aria-hidden="true" />
          Postfach
        </NavLink>
        <NavLink to="/profile" className={navClass}>
          <span className="app-icon app-icon-profile" aria-hidden="true" />
          Profil
        </NavLink>

        <button
          type="button"
          className="app-tab app-tab-plus"
          aria-expanded={createOpen}
          onClick={() => setCreateOpen((open) => !open)}
        >
          +
        </button>

        {createOpen && (
          <div className="create-sheet">
            <Link to="/games/create">Spiel erstellen</Link>
            <Link to="/play-requests">Spielgesuch erstellen</Link>
            <Link to="/series">Wiederkehrendes Spiel erstellen</Link>
          </div>
        )}
      </div>
    </>
  );
}
