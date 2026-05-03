import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { createAccount, deleteAccount as deleteAccountDoc, getAccounts, updateAccount as updateAccountDoc } from "../firebase/services/accounts";
import { createGoal, deleteGoal as deleteGoalDoc, getGoals, updateGoal as updateGoalDoc } from "../firebase/services/goals";
import { addTransaction as addTransactionDoc, deleteTransaction as deleteTransactionDoc, getTransactions } from "../firebase/services/transactions";
import { getSummary } from "../firebase/services/summary";
import { friendlyError } from "../firebase/errors";

export const DataContext = createContext(null);

const defaultSummary = {
  netWorth: 0,
  totalIncome: 0,
  totalExpenses: 0,
  totalSaved: 0
};

export function DataProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [accounts, setAccounts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setGoals([]);
      setTransactions([]);
      setSummary(defaultSummary);
      setLoadingData(false);
      return undefined;
    }

    setLoadingData(true);
    setError("");

    const handleError = (err) => {
      setError(friendlyError(err));
      setLoadingData(false);
    };

    const unsubscribers = [
      getAccounts(user.uid, setAccounts, handleError),
      getGoals(user.uid, setGoals, handleError),
      getSummary(user.uid, setSummary, handleError),
      getTransactions(user.uid, { limit: 100 }, (items) => {
        setTransactions(items);
        setLoadingData(false);
      }, handleError)
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }, [user]);

  const withUser = async (callback) => {
    if (!user) throw new Error("Please sign in first.");
    setError("");
    try {
      return await callback(user.uid);
    } catch (err) {
      const message = friendlyError(err);
      setError(message);
      throw new Error(message);
    }
  };

  const value = useMemo(
    () => ({
      accounts,
      goals,
      summary,
      transactions,
      loadingData,
      error,
      addAccount: (accountData) => withUser((userId) => createAccount(userId, accountData)),
      updateAccount: (accountId, updates) => withUser((userId) => updateAccountDoc(userId, accountId, updates)),
      deleteAccount: (accountId) => withUser((userId) => deleteAccountDoc(userId, accountId)),
      addGoal: (goalData) => withUser((userId) => createGoal(userId, goalData)),
      updateGoal: (goalId, updates) => withUser((userId) => updateGoalDoc(userId, goalId, updates)),
      deleteGoal: (goalId) => withUser((userId) => deleteGoalDoc(userId, goalId)),
      addTransaction: (txData) => withUser((userId) => addTransactionDoc(userId, txData)),
      deleteTransaction: (txId) => withUser((userId) => deleteTransactionDoc(userId, txId))
    }),
    [accounts, goals, summary, transactions, loadingData, error, user]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

