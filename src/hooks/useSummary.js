import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getSummary } from "../firebase/services/summary";
import { friendlyError } from "../firebase/errors";

export function useSummary() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setSummary(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return getSummary(
      user.uid,
      (nextSummary) => {
        setSummary(nextSummary);
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      }
    );
  }, [user]);

  return { summary, loading, error };
}

