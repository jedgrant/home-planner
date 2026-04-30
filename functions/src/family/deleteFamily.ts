import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

interface DeleteFamilyInput {
  familyId: string
}

// Permanently deletes a family and all related data.
//
// Firestore does NOT cascade-delete subcollections when a document is deleted.
// This function uses the Admin SDK's recursiveDelete() to handle that, then
// also removes invite codes and clears familyId/role on all member user docs.
export const deleteFamily = onCall<DeleteFamilyInput>(
  { region: 'us-central1' },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }

    const { familyId } = request.data
    if (!familyId?.trim()) {
      throw new HttpsError('invalid-argument', 'familyId is required.')
    }

    const adminDb = getFirestore()

    // Verify caller is a parent in this family
    const callerDoc = await adminDb.doc(`users/${request.auth.uid}`).get()
    if (!callerDoc.exists) {
      throw new HttpsError('not-found', 'User not found.')
    }
    const callerData = callerDoc.data()!
    if (callerData.familyId !== familyId) {
      throw new HttpsError('permission-denied', 'Not a member of this family.')
    }
    if (callerData.role !== 'parent') {
      throw new HttpsError('permission-denied', 'Only parents can delete the family.')
    }

    // Fetch family document to get member IDs
    const familyDoc = await adminDb.doc(`families/${familyId}`).get()
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found.')
    }
    const memberIds: string[] = familyDoc.data()?.memberIds ?? []

    // Batch: delete invite codes + clear familyId/role on all member user docs
    const inviteSnap = await adminDb.collection('inviteCodes').where('familyId', '==', familyId).get()

    const batch = adminDb.batch()

    for (const codeDoc of inviteSnap.docs) {
      batch.delete(codeDoc.ref)
    }

    for (const uid of memberIds) {
      batch.update(adminDb.doc(`users/${uid}`), {
        familyId: null,
        role: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()

    // Recursively delete the family document and ALL subcollections
    await adminDb.recursiveDelete(adminDb.doc(`families/${familyId}`))

    return { success: true }
  }
)
