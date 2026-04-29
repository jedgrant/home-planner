import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '@/shared/lib/firebase'
import { USERS } from '@/shared/lib/collections'

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName })
  await setDoc(doc(db, USERS, credential.user.uid), {
    userId: credential.user.uid,
    displayName,
    email,
    photoUrl: null,
    familyId: null,
    role: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function updateDisplayName(
  uid: string,
  displayName: string,
): Promise<void> {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName })
  }
  await updateDoc(doc(db, USERS, uid), {
    displayName,
    updatedAt: serverTimestamp(),
  })
}

export async function updatePhotoUrl(uid: string, file: File | Blob): Promise<string> {
  const fileRef = storageRef(storage, `avatars/${uid}`)
  await uploadBytes(fileRef, file)
  const url = await getDownloadURL(fileRef)
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { photoURL: url })
  }
  await updateDoc(doc(db, USERS, uid), {
    photoUrl: url,
    updatedAt: serverTimestamp(),
  })
  return url
}
