"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignTasks = exports.suggestMeal = exports.parseRecipeFromContent = exports.suggestTasks = exports.suggestRecipe = void 0;
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
// ─── suggestRecipe ────────────────────────────────────────────────────────────
// TODO: Replace stub with a real Gemini call once a project API key is configured.
exports.suggestRecipe = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { recipeName } = request.data;
    if (!(recipeName === null || recipeName === void 0 ? void 0 : recipeName.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'recipeName is required.');
    }
    // Stub response — replace with Gemini/Vertex AI call
    return {
        description: `A delicious ${recipeName} your family will love.`,
        servingSize: 4,
        ingredients: [
            { name: 'Main ingredient', quantity: '2 cups' },
            { name: 'Secondary ingredient', quantity: '1 tbsp' },
        ],
        prepTasks: [
            { description: 'Prepare all ingredients', difficulty: 'easy', order: 0 },
            { description: `Cook the ${recipeName}`, difficulty: 'medium', order: 1 },
            { description: 'Serve and enjoy', difficulty: 'easy', order: 2 },
        ],
    };
});
// ─── suggestTasks ─────────────────────────────────────────────────────────────
exports.suggestTasks = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { recipeName, ingredients = [] } = request.data;
    if (!(recipeName === null || recipeName === void 0 ? void 0 : recipeName.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'recipeName is required.');
    }
    // Stub response — replace with Gemini/Vertex AI call
    const tasks = ingredients
        .slice(0, 3)
        .map((ing, i) => ({
        description: `Prepare ${ing.name}`,
        difficulty: 'easy',
        order: i,
    }));
    tasks.push({
        description: `Combine and cook ${recipeName}`,
        difficulty: 'medium',
        order: tasks.length,
    });
    return { prepTasks: tasks };
});
exports.parseRecipeFromContent = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { text, imageBase64 } = request.data;
    if (!(text === null || text === void 0 ? void 0 : text.trim()) && !imageBase64) {
        throw new https_1.HttpsError('invalid-argument', 'Either text or imageBase64 is required.');
    }
    // Stub response — replace with Gemini/Vertex AI call.
    // Real implementation would send text or the image to the model and
    // extract structured recipe data from its response.
    return {
        name: 'Parsed Recipe',
        courseType: 'entree',
        description: 'A delicious recipe parsed from your content.',
        servingSize: 4,
        ingredients: [
            { name: 'Main ingredient', quantity: '2 cups' },
            { name: 'Secondary ingredient', quantity: '1 tbsp' },
        ],
        prepTasks: [
            { description: 'Prepare all ingredients', difficulty: 'easy', order: 0 },
            { description: 'Cook according to instructions', difficulty: 'medium', order: 1 },
            { description: 'Serve and enjoy', difficulty: 'easy', order: 2 },
        ],
    };
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
//# sourceMappingURL=index.js.map