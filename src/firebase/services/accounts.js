import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../config";
import { recalculateSummary } from "./summary";

const accountsRef = (userId) => collection(db, "users", userId, "accounts");

export async function createAccount(userId, accountData) {
  try {
    const ref = await addDoc(accountsRef(userId), {
      userId,
      name: accountData.name,
      type: accountData.type || "cash",
      balance: Number(accountData.balance || 0),
      color: accountData.color || "#d4c8f5",
      institution: accountData.institution || "",
      createdAt: serverTimestamp()
    });
    await recalculateSummary(userId);
    return ref;
  } catch (error) {
    throw error;
  }
}

export function getAccounts(userId, next, error) {
  const q = query(accountsRef(userId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => next(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
    error
  );
}

export async function updateAccount(userId, accountId, updates) {
  try {
    await updateDoc(doc(db, "users", userId, "accounts", accountId), {
      ...updates,
      ...(updates.balance !== undefined ? { balance: Number(updates.balance) } : {})
    });
    await recalculateSummary(userId);
  } catch (error) {
    throw error;
  }
}

export async function deleteAccount(userId, accountId) {
  try {
    await deleteDoc(doc(db, "users", userId, "accounts", accountId));
    await recalculateSummary(userId);
  } catch (error) {
    throw error;
  }
}
