import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../config";
import { recalculateSummary } from "./summary";

const goalsRef = (userId) => collection(db, "users", userId, "goals");

export async function createGoal(userId, goalData) {
  try {
    const ref = await addDoc(goalsRef(userId), {
      userId,
      title: goalData.title,
      category: goalData.category || "other",
      type: goalData.type || "individual",
      targetAmount: Number(goalData.targetAmount || 0),
      savedAmount: Number(goalData.savedAmount || 0),
      icon: goalData.icon || "target",
      deadline: goalData.deadline || null,
      createdAt: serverTimestamp()
    });
    await recalculateSummary(userId);
    return ref;
  } catch (error) {
    throw error;
  }
}

export function getGoals(userId, next, error) {
  const q = query(goalsRef(userId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => next(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
    error
  );
}

export async function updateGoal(userId, goalId, updates) {
  try {
    await updateDoc(doc(db, "users", userId, "goals", goalId), {
      ...updates,
      ...(updates.targetAmount !== undefined ? { targetAmount: Number(updates.targetAmount) } : {}),
      ...(updates.savedAmount !== undefined ? { savedAmount: Number(updates.savedAmount) } : {})
    });
    await recalculateSummary(userId);
  } catch (error) {
    throw error;
  }
}

export async function deleteGoal(userId, goalId) {
  try {
    await deleteDoc(doc(db, "users", userId, "goals", goalId));
    await recalculateSummary(userId);
  } catch (error) {
    throw error;
  }
}

export async function getGoalById(userId, goalId) {
  try {
    const snapshot = await getDoc(doc(db, "users", userId, "goals", goalId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {
    throw error;
  }
}
