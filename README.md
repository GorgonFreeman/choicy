# choicy

A terminal interface to facilitate choosing one or multiple options from a numbered list.

```js
// ESM
import choicy from 'choicy';

// CommonJS
const choicy = require('choicy');

const selected = await choicy(choices, {
  question,
  titleProp,
  valueProp,
  index0, // whether numbering starts at 0 or 1
  oneChoice = false, // default to multiple choices
  presets = [], // { key: 'x', choices: [...] }
});
```

The UI function should take an array of choices. 

The resulting interface will present a list like:
```
What would you like on your pizza?
[1] Tomato
[2] Pineapple
[3] Mushroom
```
Each choice has a "title" and a "value". The "title" is what shows on the UI, the value is what is returned once the function resolves.

If the choices input are strings, the title and value are both the string.

If they are objects, the title is the choice's titleProp, or 'title', 'name' 'id', or finally the object stringified:
```
choice?.[titleProp] || choice?.title || choice?.name || choice?.id || `${ JSON.stringify(choice).slice(0, 30) }…`
```
and the value is choice's valueProp, or the full object:
```
valueProp ? choice?.[valueProp] : choice
```

If the function is called with oneChoice, return a single value. Otherwise, return an array of choices, even if one.

Users can select options by: 
- entering the corresponding number (or CSV of numbers) and pressing Enter
- or by navigating the list with arrow keys and pressing Space to select.

If users select an option with their keyboard but have input partially typed, ignore the input and leave it alone.

Options are toggles, meaning selecting once includes it, and twice excludes it again. Entering a number or CSV of numbers and pressing Enter toggles those choices; it does not submit. Submitting happens by pressing Enter again with no input.

When selected, the option should change colour to cyan.

If users make no input and press enter, their existing selected choices are submitted. If the user has made no existing choices, the step is skipped.

If invalid input is submitted, it can't be submitted, and the input goes red. Escape/Ctrl+C should also be supported to cancel, and out-of-range numbers should be treated as invalid input.

If oneChoice, the interaction changes: any valid selection (via Space or typed number + Enter) autosubmits immediately, returning a single choice rather than an array. (TODO: Consider just overriding the current choice to make UX uniform)

Presets can be provided. Presets represent groups of choices, and if the user selects a preset, those choices are submitted, shortcutting the question.

Presets are supplied as e.g.
```
{
  key: 'starters',
  choices: ['Squirtle', 'Charmander', 'Bulbasaur'],
}
```
and show as:
```
[starters] Squirtle, Charmander, Bulbasaur
```

These presets show as a separate list of options, above the choices, separated by a newline, and must be selected with strings. 

A preset's `key` functions as both its identifier (what's typed to select it) and its title. 

Preset keys should be validated as being strings to prevent conflicts with the numbered lists. Choices should be validated as an array if choosing multiple, or not-an-array if choosing single. (TODO: Consider what happens if we are choosing between arrays - currently, workaround with object wrappers)

If a preset is chosen, all other selections are ignored, and that preset's choices go through as-is - it doesn't need to match entries in the original choices array. If no presets are supplied, this list isn't shown.

## Development roadmap

### v0.0.1
- Takes only an array of strings, so no title or value logic
- Only supports multiple choices
- No keyboard navigation, typing only, no CSV support
- Toggling uses chalk to change colour to cyan
- As simple and minimal as possible

### v0.0.2
- Supports objects as choices, with titleProp and valueProp, and resolveTitle and resolveValue helpers

### v0.0.3
- Supports single choice (chooseOne) mode

### v0.0.4
- Supports index0

### v0.0.5
- Supports keyboard navigation

### v0.0.6
- Supports presets

### v1.0.0
- Supports "protected" choices with a protectedChoices option - lock emoji + teal colour, can't be selected.

### v1.0.1
- Don't show "Choices" section title if no presets.
- Export chooseInteractive as default instead of its own function.

### v1.0.2
- Support CSV of keys as input - if commas are present, treat as a CSV, and select all choices mentioned. Errors should be handled gracefully and other choices selected.

### v1.1.0
- Dual package: ESM via `import` and CommonJS via `require` (`index.cjs` loads the ESM entry).

### Future
- Supports a "preselected" choice/group of choices. These should show in yellow, below the list of choices, in the same format as presets. If there are preselected choices, the cursor should start there, so the user can easily press space + enter to proceed.