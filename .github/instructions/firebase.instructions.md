---
description: "Use when writing any Firebase-related code: Firestore reads/writes, Auth, Storage, Cloud Functions, security rules, or emulator setup. Covers data access patterns, collection naming, real-time subscriptions, and server-side function conventions."
applyTo: "{src/shared/lib/**,src/features/**/hooks/**,functions/**}/*.ts"
---

# Firebase Conventions

## Initialization

- Firebase is initialized exactly once in `src/shared/lib/firebase.ts`. Import `db`, `auth`, and `storage` from there — never call `initializeApp` anywhere else.
- Cloud Functions are initialized in their own `functions/src/index.ts` entry point and are a separate package.

```ts
// src/shared/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

## Collection Names

- All Firestore collection and subcollection names are defined as constants in `src/shared/lib/collections.ts`. Never use hardcoded strings.

```ts
// src/shared/lib/collections.ts
export const COLLECTIONS = {
  FAMILIES: "families",
  USERS: "users",
  CHORE_GROUPS: "choreGroups",
  CHORES: "chores",
  CHORE_WEEKS: "choreWeeks",
  STORES: "stores",
  GROCERY_ITEMS: "groceryItems",
  QUICK_PICK_ITEMS: "quickPickItems",
  DISHES: "dishes",
  MEALS: "meals",
} as const;
```

## Data Access Patterns

### One-time reads → TanStack Query

Use TanStack Query (`useQuery`) for data that does not need live updates. Always scope `queryKey` to the family and any relevant entity IDs to prevent cache collisions across families.

```ts
const { data, isLoading, isError } = useQuery({
  queryKey: ["choreGroups", familyId],
  queryFn: () =>
    getDocs(
      collection(db, COLLECTIONS.FAMILIES, familyId, COLLECTIONS.CHORE_GROUPS)
    ).then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChoreGroup))),
});
```

### Real-time subscriptions → onSnapshot in a custom hook

Use `onSnapshot` only for views that genuinely require live updates:
- Weekly chore execution view
- Active shopping lists
- Meal task assignment view

Wrap every subscription in a dedicated `useSnapshot` hook that handles setup, teardown, and loading state. Never call `onSnapshot` directly inside a component.

```ts
// features/chores/hooks/useChoreWeek.ts
export function useChoreWeek(familyId: string, weekId: string) {
  const [data, setData] = useState<ChoreWeek | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, COLLECTIONS.FAMILIES, familyId, COLLECTIONS.CHORE_WEEKS, weekId);
    const unsub = onSnapshot(ref, (snap) => {
      setData(snap.exists() ? { id: snap.id, ...snap.data() } as ChoreWeek : null);
      setIsLoading(false);
    });
    return unsub;
  }, [familyId, weekId]);

  return { data, isLoading };
}
```

## Writes

- Every Firestore document write must include `updatedAt: serverTimestamp()`.
- New documents must include `createdAt: serverTimestamp()`.
- Use `setDoc` with `{ merge: true }` for upserts. Use `updateDoc` for partial updates to existing documents.
- Batch related writes using `writeBatch` when multiple documents must succeed or fail together.

```ts
await updateDoc(choreRef, {
  status: "complete",
  verifiedBy: userId,
  verifiedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
```

## TypeScript & Document Shapes

- Every Firestore collection has a corresponding TypeScript interface in `src/shared/types/`.
- Never use `DocumentData` or anonymous `{ [key: string]: any }` shapes for read results.
- Use a consistent conversion helper when mapping snapshot docs to typed objects:

```ts
// Good
snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChoreGroup))

// Bad
snap.docs.map((d) => d.data())
```

## Security Rules

- Firestore Security Rules in `firestore.rules` are the authority on access control. All role-based restrictions must be enforced there.
- Client-side checks (e.g., hiding a button from children) are UX convenience only — never treat them as security.
- When writing a new collection or access pattern, update `firestore.rules` before considering the feature complete.

## Cloud Functions

- All functions are HTTPS callable (not HTTP trigger) unless there is a specific background trigger reason.
- Every callable function must verify `context.auth` is present before doing any work; reject unauthenticated calls with `functions.https.HttpsError("unauthenticated", ...)`.
- The Gemini API key is stored as a Firebase secret (`defineSecret`). Never hardcode it or log it.
- Keep each function small and single-purpose. The 150-line rule applies to function files too.

```ts
// functions/src/generateTasks.ts
export const generateTasks = onCall({ secrets: [geminiApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }
  // ...
});
```

## Emulator

- All local development targets the Firebase Emulator Suite. The emulator connection is configured in `src/shared/lib/firebase.ts` based on an env variable (e.g., `VITE_USE_EMULATOR=true`).
- Never call `firebase deploy` during development. Never write to the production project from a local environment.
- Emulator ports: Firestore 8080, Auth 9099, Storage 9199, Functions 5001 (defaults).
