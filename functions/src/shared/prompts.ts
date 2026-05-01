/**
 * Shared prompt fragments used across multiple AI functions.
 */

/**
 * Guidance for generating prepTasks — shared between suggestTasks and
 * parseRecipeFromContent so both functions use identical rules.
 *
 * The app is used by families cooking together; tasks are assigned to
 * individual people (often a child helping a parent).
 */
export const PREP_TASKS_GUIDANCE = `prepTasks rules:
The ONLY test for whether a step is a prepTask: "Could a different person do this step simultaneously while someone else does a different step on the same component?"

- YES (make a task): Prepping individual vegetables — chopping carrots while someone else chops broccoli; trimming chicken while someone else mixes a marinade; making a sauce while someone else cooks protein.
- NO (put in notes instead): Any step that must happen sequentially after a previous step — you cannot stir-fry vegetables before they are chopped, so stir-frying is NOT a task. Cooking, baking, simmering, assembling — these are notes.
- If a component only has ONE task, do not create a task at all. Put the full instructions in the component's notes field instead. tasks must be empty ([]).
- Task description format: "Short name: full detail" e.g. "Prep broccoli: Cut into 1-inch florets and rinse." or "Trim chicken: Remove fat and sinew, cut into 1-inch cubes."
- difficulty: easy = basic prep (peeling, rinsing), medium = some skill (julienne, deboning), hard = complex technique.
- order starts at 0 and follows the logical prep sequence within the component.`
