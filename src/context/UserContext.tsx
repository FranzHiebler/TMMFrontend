/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

export type User = {
  userId: string;
  displayName: string;
};

type UserContextValue = User & {
  setUser: (user: User) => void;
};

const defaultUser: User = {
  userId: "64f1a2b3c4d5e6f7890abc12",
  displayName: "Franz",
};

function loadInitialUser(): User {
  const stored = localStorage.getItem("tmm-current-user");
  if (!stored) return defaultUser;

  try {
    return JSON.parse(stored) as User;
  } catch {
    return defaultUser;
  }
}

const UserContext = createContext<UserContextValue>({
  ...defaultUser,
  setUser: () => {},
});

type Props = {
  children: React.ReactNode;
};

export function UserProvider({ children }: Props) {
  const [user, setUserState] = useState<User>(loadInitialUser);

  function setUser(nextUser: User) {
    localStorage.setItem("tmm-current-user", JSON.stringify(nextUser));
    setUserState(nextUser);
  }

  return (
    <UserContext.Provider value={{ ...user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}