import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { addTransaction, deleteTransaction, getTransactions } from "../firebase/services/transactions";
import { friendlyError } from "../firebase/errors";

export function useTransactions(filters = {}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState("");
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return getTransactions(
      user.uid,
      filters,
      (items) => {
        setTransactions(items);
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      }
    );
  }, [user, filterKey]);

  return {
    transactions,
    loading,
    error,
    addTransaction: (data) => addTransaction(user.uid, data),
    deleteTransaction: (txId) => deleteTransaction(user.uid, txId)
  };
}

