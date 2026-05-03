import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { createAccount, deleteAccount, getAccounts, updateAccount } from "../firebase/services/accounts";
import { friendlyError } from "../firebase/errors";

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return getAccounts(
      user.uid,
      (items) => {
        setAccounts(items);
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      }
    );
  }, [user]);

  return {
    accounts,
    loading,
    error,
    addAccount: (data) => createAccount(user.uid, data),
    updateAccount: (accountId, updates) => updateAccount(user.uid, accountId, updates),
    deleteAccount: (accountId) => deleteAccount(user.uid, accountId)
  };
}

