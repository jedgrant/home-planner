"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFamily = exports.assignTasks = exports.suggestMeal = exports.parseRecipeFromContent = exports.suggestTasks = exports.suggestRecipe = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const generative_ai_1 = require("@google/generative-ai");
(0, app_1.initializeApp)();
const geminiApiKey = (0, params_1.defineSecret)('GEMINI_API_KEY');
function getGemini() {
    return new generative_ai_1.GoogleGenerativeAI(geminiApiKey.value()).getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
    });
}
// ─── suggestRecipe ────────────────────────────────────────────────────────────
exports.suggestRecipe = (0, https_1.onCall)({ region: 'us-central1', secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { recipeName } = request.data;
    if (!(recipeName === null || recipeName === void 0 ? void 0 : recipeName.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'recipeName is required.');
    }
    const prompt = `You are a recipe assistant. Generate a complete recipe for "${recipeName}".

Return a JSON object with exactly this shape:
{
  "description": string,        // 1–3 sentence description / cooking notes
  "servingSize": number,        // typical number of people it serves
  "ingredients": [
    { "name": string, "quantity": string }
  ],
  "prepTasks": [
    { "description": string, "difficulty": "easy"|"medium"|"hard", "order": number }
  ]
}

Rules:
- All task descriptions should be action-oriented (e.g. "Dice the onions").
- difficulty reflects physical/skill effort: easy = basic, medium = some skill, hard = complex technique.
- order starts at 0 and follows logical cooking sequence.
- Return only valid JSON, no markdown fences.`;
    try {
        const model = getGemini();
        const result = await model.generateContent(prompt);
        const json = result.response.text();
        return JSON.parse(json);
    }
    catch (err) {
        console.error('suggestRecipe Gemini error', err);
        throw new https_1.HttpsError('internal', 'Failed to generate recipe.');
    }
});
// ─── suggestTasks ─────────────────────────────────────────────────────────────
exports.suggestTasks = (0, https_1.onCall)({ region: 'us-central1', secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { recipeName, ingredients = [], notes } = request.data;
    if (!(recipeName === null || recipeName === void 0 ? void 0 : recipeName.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'recipeName is required.');
    }
    const ingredientList = ingredients.map((i) => `- ${i.name} (${i.quantity})`).join('\n');
    const prompt = `You are a recipe assistant. Generate an ordered list of prep tasks for the recipe "${recipeName}".

${ingredientList ? `Ingredients:\n${ingredientList}\n` : ''}${notes ? `Notes: ${notes}\n` : ''}
Return a JSON object with exactly this shape:
{
  "prepTasks": [
    { "description": string, "difficulty": "easy"|"medium"|"hard", "order": number }
  ]
}

Rules:
- Each task should be a single, discrete action (e.g. "Mince the garlic").
- difficulty: easy = basic prep, medium = some skill, hard = complex technique.
- order starts at 0 and follows logical cooking sequence.
- Return only valid JSON, no markdown fences.`;
    try {
        const model = getGemini();
        const result = await model.generateContent(prompt);
        const json = result.response.text();
        return JSON.parse(json);
    }
    catch (err) {
        console.error('suggestTasks Gemini error', err);
        throw new https_1.HttpsError('internal', 'Failed to generate tasks.');
    }
});
exports.parseRecipeFromContent = (0, https_1.onCall)({ region: 'us-central1', secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { text, imageBase64, imageMediaType } = request.data;
    if (!(text === null || text === void 0 ? void 0 : text.trim()) && !imageBase64) {
        throw new https_1.HttpsError('invalid-argument', 'Either text or imageBase64 is required.');
    }
    const systemPrompt = `You are a recipe parsing assistant. Extract a structured recipe from the provided content (text, image, or both).

Return a JSON object with exactly this shape:
{
  "name": string,
  "courseType": "entree"|"side"|"salad"|"fruit"|"dessert",
  "description": string,
  "servingSize": number,
  "ingredients": [
    { "name": string, "quantity": string }
  ],
  "prepTasks": [
    { "description": string, "difficulty": "easy"|"medium"|"hard", "order": number }
  ]
}

Rules:
- name: the recipe's proper title.
- courseType: best guess based on the dish type.
- servingSize: number of servings; use 4 if unknown.
- ingredients: each entry has a name and a quantity (e.g. "2 cups"). Split combined entries into separate items.
- description: Always provide a 1-3 sentence description of the dish. Include what it tastes like, how it's typically served, and what sides, toppings, or other elements it pairs well with. Never leave this empty.

CRITICAL — description (notes) vs. prepTasks:
The app is used by families cooking together. prepTasks are assigned to individual people (often a child helping a parent).

- description: The 1-3 sentence overview described above. Do NOT put step-by-step cooking instructions here.
- prepTasks: Use for any discrete step that would take 5 or more minutes on its own, or any step that could meaningfully be handed off to a separate person. Examples that SHOULD be prep tasks: "Chop and wash the lettuce", "Defrost and brown the ground beef", "Boil and drain the pasta", "Dice the onions and peppers". Examples that should NOT be prep tasks (too quick/trivial): "Open the can", "Sprinkle salt". For simple sides or toppings where all steps are quick and done by one person (e.g. canned corn, sliced fruit), leave prepTasks empty.
- Each prep task must be a single, assignable action with enough detail to stand alone (e.g. "Brown 1 lb ground beef in a skillet over medium heat until no pink remains" rather than just "Cook beef").

- Return only valid JSON, no markdown fences.`;
    try {
        const model = getGemini();
        const contentParts = [systemPrompt];
        if (imageBase64 && imageMediaType) {
            contentParts.push({
                inlineData: { mimeType: imageMediaType, data: imageBase64 },
            });
        }
        if (text === null || text === void 0 ? void 0 : text.trim()) {
            contentParts.push(text.trim());
        }
        const result = await model.generateContent(contentParts);
        const json = result.response.text();
        console.log('Gemini parseRecipeFromContent response', json);
        return JSON.parse(json);
    }
    catch (err) {
        console.error('parseRecipeFromContent Gemini error', err);
        throw new https_1.HttpsError('internal', 'Failed to parse recipe from content.');
    }
});
exports.suggestMeal = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { date } = request.data;
    if (!(date === null || date === void 0 ? void 0 : date.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'date is required.');
    }
    // Stub response — replace with Gemini/Vertex AI call
    return {
        name: `Dinner ${date}`,
        suggestions: [
            {
                recipeId: '',
                recipeName: 'Suggested Entree',
                courseType: 'entree',
                rationale: 'Based on your recent meal history, this would be a great choice.',
            },
            {
                recipeId: '',
                recipeName: 'Suggested Side',
                courseType: 'side',
                rationale: 'Pairs well with the suggested entree.',
            },
        ],
    };
});
exports.assignTasks = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { mealId } = request.data;
    if (!(mealId === null || mealId === void 0 ? void 0 : mealId.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'mealId is required.');
    }
    // Stub response — replace with Gemini/Vertex AI call
    return { assignments: [] };
});
exports.deleteFamily = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { familyId } = request.data;
    if (!(familyId === null || familyId === void 0 ? void 0 : familyId.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'familyId is required.');
    }
    const adminDb = (0, firestore_1.getFirestore)();
    // Verify caller is a parent in this family
    const callerDoc = await adminDb.doc(`users/${request.auth.uid}`).get();
    if (!callerDoc.exists) {
        throw new https_1.HttpsError('not-found', 'User not found.');
    }
    const callerData = callerDoc.data();
    if (callerData.familyId !== familyId) {
        throw new https_1.HttpsError('permission-denied', 'Not a member of this family.');
    }
    if (callerData.role !== 'parent') {
        throw new https_1.HttpsError('permission-denied', 'Only parents can delete the family.');
    }
    // Fetch family document to get member IDs
    const familyDoc = await adminDb.doc(`families/${familyId}`).get();
    if (!familyDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Family not found.');
    }
    const memberIds = (_b = (_a = familyDoc.data()) === null || _a === void 0 ? void 0 : _a.memberIds) !== null && _b !== void 0 ? _b : [];
    // Batch: delete invite codes + clear familyId/role on all member user docs
    const inviteSnap = await adminDb
        .collection('inviteCodes')
        .where('familyId', '==', familyId)
        .get();
    const batch = adminDb.batch();
    for (const codeDoc of inviteSnap.docs) {
        batch.delete(codeDoc.ref);
    }
    for (const uid of memberIds) {
        batch.update(adminDb.doc(`users/${uid}`), {
            familyId: null,
            role: null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    // Recursively delete the family document and ALL subcollections
    await adminDb.recursiveDelete(adminDb.doc(`families/${familyId}`));
    return { success: true };
});
//# sourceMappingURL=index.js.map