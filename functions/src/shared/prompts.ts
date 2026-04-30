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
- Use for any discrete step that would take 5 or more minutes on its own, or any step that could meaningfully be handed off to a separate person.
- Examples that SHOULD be prep tasks: "Chop and wash the lettuce", "Defrost and brown the ground beef", "Boil and drain the pasta", "Dice the onions and peppers".
- Examples that should NOT be prep tasks (too quick/trivial): "Open the can", "Sprinkle salt".
- For simple sides or toppings where all steps are quick and done by one person (e.g. canned corn, sliced fruit), leave prepTasks empty.
- Each prep task must be a single, assignable action with enough detail to stand alone (e.g. "Brown 1 lb ground beef in a skillet over medium heat until no pink remains" rather than just "Cook beef").`
