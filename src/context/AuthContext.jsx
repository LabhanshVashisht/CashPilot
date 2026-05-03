import { createContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail
} from "../firebase/auth";
import { friendlyError } from "../firebase/errors";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const runAuth = async (callback) => {
    setError("");
    try {
      return await callback();
    } catch (err) {
      const message = friendlyError(err);
      setError(message);
      throw new Error(message);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      signUp: (email, password, name) => runAuth(() => signUpWithEmail(email, password, name)),
      signIn: (email, password) => runAuth(() => signInWithEmail(email, password)),
      signInGoogle: () => runAuth(() => signInWithGoogle()),
      logOut: () => runAuth(() => signOut())
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

