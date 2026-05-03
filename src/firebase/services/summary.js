import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../config";

const emptySummary = {
  netWorth: 0,
  totalIncome: 0,
  totalExpenses: 0,
  totalSaved: 0,
  lastUpdated: null
};

export function getSummary(userId, next, error) {
  return onSnapshot(
    doc(db, "users", userId, "summary", "aggregates"),
    (snapshot) => next(snapshot.exists() ? { ...emptySummary, ...snapshot.data() } : emptySummary),
    error
  );
}

export async function recalculateSummary(userId) {
  const transactionsSnap = await getDocs(collection(db, "users", userId, "transactions"));
  const accountsSnap = await getDocs(collection(db, "users", userId, "accounts"));
  const goalsSnap = await getDocs(collection(db, "users", userId, "goals"));

  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionNet = 0;

  transactionsSnap.forEach((snapshot) => {
    const tx = snapshot.data();
    const amount = Number(tx.amount || 0);
    if (tx.type === "income") {
      totalIncome += amount;
      transactionNet += amount;
    }
    if (tx.type === "expense") {
      totalExpenses += amount;
      transactionNet -= amount;
    }
  });

  let accountNetWorth = 0;
  accountsSnap.forEach((snapshot) => {
    const account = snapshot.data();
    const balance = Number(account.balance || 0);
    accountNetWorth += account.type === "credit" ? -Math.abs(balance) : balance;
  });

  let totalSaved = 0;
  goalsSnap.forEach((snapshot) => {
    totalSaved += Number(snapshot.data().savedAmount || 0);
  });

  const batch = writeBatch(db);
  batch.set(
    doc(db, "users", userId, "summary", "aggregates"),
    {
      netWorth: accountNetWorth + transactionNet,
      totalIncome,
      totalExpenses,
      totalSaved,
      lastUpdated: serverTimestamp()
    },
    { merge: true }
  );
  await batch.commit();
}

