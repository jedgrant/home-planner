import { useEffect, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/shared/lib/firebase'
import { useAuthStore, type AuthUser } from '@/shared/lib/authStore'
import { USERS } from '@/shared/lib/collections'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, clear } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clear()
        return
      }

      try {
        const userDoc = await getDoc(doc(db, USERS, firebaseUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          const user: AuthUser = {
            uid: firebaseUser.uid,
            displayName: data.displayName ?? firebaseUser.displayName ?? '',
            email: firebaseUser.email ?? '',
            photoUrl: data.photoUrl ?? firebaseUser.photoURL ?? null,
            familyId: data.familyId ?? null,
            role: data.role ?? null,
          }
          setUser(user)
        } else {
          // Auth user exists but no Firestore profile yet (mid-registration)
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName ?? '',
            email: firebaseUser.email ?? '',
            photoUrl: firebaseUser.photoURL ?? null,
            familyId: null,
            role: null,
          })
        }
      } catch {
        clear()
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [setUser, setLoading, clear])

  return <>{children}</>
}
