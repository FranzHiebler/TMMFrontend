import { Link, NavLink, Route, Routes } from "react-router-dom";
import GamesPage from "./pages/GamesPage";
import NearbyPage from "./pages/NearbyPage";
import LocationsPage from "./pages/LocationPage";
import CreateGamePage from "./pages/CreateGamePage";
import MyGamesPage from "./pages/MyGamesPage";
import MapDiscoveryPage from "./pages/MapDiscoveryPage";
import ProfilePage from "./pages/ProfilePage";
import UserSwitcher from "./components/UserSwitcher";
import DirectMessagesPage from "./pages/DirectMessagesPage";
import NotificationBell from "./components/NotificationBell";
import FriendsPage from "./pages/FriendsPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import SessionDetailPage from "./pages/SessionDetailPage";
import SystemsAdminPage from "./pages/SystemsAdminPage";
import { useUser } from "./context/UserContext";

const adminUserIds = ["64f1a2b3c4d5e6f7890abc12"];

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "nav-link active" : "nav-link";
}

export default function App() {
  const user = useUser();
  const isAdmin = adminUserIds.includes(user.userId);

  return (
    <>
      <nav className="app-nav">
        <Link className="nav-brand" to="/" aria-label="Zur Startseite">
          <span className="nav-brand-mark">TMM</span>
          <span className="nav-brand-text">Tabletop Matchmaker</span>
        </Link>

        <div className="nav-links">
          <NavLink to="/my-games" className={navClass}>
            Meine Spiele
          </NavLink>

          <NavLink to="/messages" className={navClass}>
            Nachrichten
          </NavLink>
        </div>

        <div className="nav-actions">
          <NavLink to="/games/create" className="nav-create-button">
            + Spiel
          </NavLink>

          <details className="nav-more">
            <summary>Mehr</summary>

            <div className="nav-more-menu">
              <NavLink to="/friends" className={navClass}>
                Freunde
              </NavLink>

              <NavLink to="/locations" className={navClass}>
                Meine Locations
              </NavLink>

              <NavLink to="/nearby" className={navClass}>
                Locations suchen
              </NavLink>

              <NavLink to="/games" className={navClass}>
                Alle Spiele
              </NavLink>

              <NavLink to="/profile" className={navClass}>
                Profil
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin/systems" className={navClass}>
                  Systeme verwalten
                </NavLink>
              )}

              <div className="nav-more-divider" />

              <div className="nav-user-switcher">
                <UserSwitcher />
              </div>
            </div>
          </details>

          <NotificationBell />
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
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/users/:userId" element={<PublicProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {isAdmin && <Route path="/admin/systems" element={<SystemsAdminPage />} />}
      </Routes>
    </>
  );
}