import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { createGoal, deleteGoal, getGoals, updateGoal } from "../firebase/services/goals";
import { friendlyError } from "../firebase/errors";

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return getGoals(
      user.uid,
      (items) => {
        setGoals(items);
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      }
    );
  }, [user]);

  return {
    goals,
    loading,
    error,
    addGoal: (data) => createGoal(user.uid, data),
    updateGoal: (goalId, updates) => updateGoal(user.uid, goalId, updates),
    deleteGoal: (goalId) => deleteGoal(user.uid, goalId)
  };
}

