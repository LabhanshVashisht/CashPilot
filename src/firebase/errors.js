export function friendlyError(error) {
  const code = error?.code || "";

  if (code === "auth/email-already-in-use") return "An account with this email already exists.";
  if (code === "auth/configuration-not-found") {
    return "Firebase Authentication is not enabled for this project. Enable Authentication and the selected sign-in provider in Firebase Console.";
  }
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Incorrect password. Please try again.";
  if (code === "auth/user-not-found") return "No account found with this email.";
  if (code === "permission-denied") return "Firestore blocked this account's data. Deploy the updated firestore.rules file for this Firebase project.";
  if (code === "unavailable") return "You appear to be offline. Changes will sync when reconnected.";

  return error?.message || "Something went wrong. Please try again.";
}
