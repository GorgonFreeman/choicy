import readline from 'readline';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

const chooseInteractive = async (
  choices,
  {
    question,
    titleProp,
    valueProp,
    oneChoice = false,
    skippable = false,
    index0 = false,
    presets = [],
    protectedChoices = [],
    alternateScreen = true,
  } = {},
) => {

  for (const preset of presets) {
    if (typeof preset.key !== 'string') {
      throw new Error(`Preset key must be a string: ${ JSON.stringify(preset.key) }`);
    }

    const isArray = Array.isArray(preset.choices);

    if (oneChoice && isArray) {
      throw new Error(`Preset "${ preset.key }" choices must not be an array when oneChoice is set`);
    }

    if (!oneChoice && !isArray) {
      throw new Error(`Preset "${ preset.key }" choices must be an array`);
    }
  }

  const resolveTitle = (choice) => {
    if (typeof choice === 'string') {
      return choice;
    }
    
    return choice?.[titleProp] 
      || choice?.title 
      || choice?.name 
      || choice?.id 
      || `${JSON.stringify(choice).slice(0, 30)}…`
    ;
  };

  const resolveValue = (choice) => {
    return choice?.[valueProp] 
      || choice 
    ;
  };

  const enrichedChoices = {};
  let startingIndex = index0 ? 0 : 1;
  for (const choice of choices) {
    const title = resolveTitle(choice);
    const value = resolveValue(choice);
    enrichedChoices[startingIndex] = {
      title, 
      value, 
      isProtected: protectedChoices.includes(choice),
    };
    startingIndex++;
  }

  const keys = Object.keys(enrichedChoices);
  const selected = new Set();
  let cursor = presets.length;
  let scrollOffset = 0;
  let buffer = '';
  let error = '';
  let linesPrinted = 0;
  let alternateScreenActive = false;

  const stripAnsi = (text) => String(text).replace(/\x1b\[[0-9;]*m/g, '');

  const terminalRows = () => process.stdout.rows || 24;
  const terminalColumns = () => Math.max(1, process.stdout.columns || 80);

  // Count how many terminal rows a printed line will occupy (wrap-aware).
  const visualRows = (text) => {
    const cols = terminalColumns();
    return stripAnsi(text).split('\n').reduce((sum, line) => {
      return sum + Math.max(1, Math.ceil(Math.max(line.length, 1) / cols));
    }, 0);
  };

  const choicePlainLabel = (key) => {
    const { title, isProtected } = enrichedChoices[key];
    const label = isProtected ? `🔒 ${ title }` : title;
    return `  [${ key }] ${ label }`;
  };

  const enterAlternateScreen = () => {
    if (!alternateScreen || !process.stdout.isTTY || alternateScreenActive) {
      return;
    }
    process.stdout.write('\x1b[?1049h\x1b[H');
    alternateScreenActive = true;
    linesPrinted = 0;
  };

  const leaveAlternateScreen = () => {
    if (!alternateScreenActive) {
      return;
    }
    process.stdout.write('\x1b[?1049l');
    alternateScreenActive = false;
    linesPrinted = 0;
  };

  return new Promise((resolve, reject) => {

    const hintText = () => oneChoice
      ? `Type a number/preset or use arrows + Space to choose.`
      : `Type a number/preset or use arrows + Space to toggle. Press Enter when done.`;

    const getChromeRows = () => {
      let reserved = visualRows(hintText()) + visualRows(`Input: ${ buffer }`);
      if (question) reserved += visualRows(question);
      if (error) reserved += visualRows(error);
      if (presets.length > 0) {
        reserved += visualRows('Presets:');
        presets.forEach((preset) => {
          const presetChoices = Array.isArray(preset.choices) ? preset.choices : [preset.choices];
          const titles = presetChoices.map((choice) => resolveTitle(choice)).join(', ');
          reserved += visualRows(`  [${ preset.key }] ${ titles }`);
        });
        reserved += visualRows('') + visualRows('Choices:');
      }
      return reserved;
    };

    const choiceRowCounts = () => keys.map((key) => visualRows(choicePlainLabel(key)));

    const getScrollLayout = () => {
      const rows = terminalRows();
      const chromeRows = getChromeRows();
      const available = Math.max(1, rows - chromeRows);
      const rowCounts = choiceRowCounts();
      const totalChoiceRows = rowCounts.reduce((sum, n) => sum + n, 0);
      const ellipsisRows = visualRows('...');

      if (totalChoiceRows <= available) {
        scrollOffset = 0;
        return {
          maxChoices: keys.length,
          hasMoreAbove: false,
          hasMoreBelow: false,
        };
      }

      const cursorChoiceIndex = cursor >= presets.length
        ? cursor - presets.length
        : 0;

      // Keep the cursor row in view, then pack as many neighbors as fit.
      scrollOffset = Math.min(scrollOffset, cursorChoiceIndex);
      if (cursorChoiceIndex < scrollOffset) {
        scrollOffset = cursorChoiceIndex;
      }

      const maxChoicesFitting = (start, budget, forceAbove, forceBelow) => {
        const reserved = (forceAbove ? ellipsisRows : 0) + (forceBelow ? ellipsisRows : 0);
        let budgetLeft = budget - reserved;
        if (budgetLeft < 1) {
          budgetLeft = Math.max(1, budget - ellipsisRows);
        }

        let count = 0;
        let used = 0;
        for (let i = start; i < keys.length; i++) {
          const next = rowCounts[i];
          if (count > 0 && used + next > budgetLeft) {
            break;
          }
          if (count === 0 && next > budgetLeft) {
            // Always show at least the cursor choice, even if it wraps heavily.
            return 1;
          }
          used += next;
          count += 1;
        }
        return Math.max(1, count);
      };

      // Grow/shrink window until cursor fits and ellipsis flags are stable.
      for (let pass = 0; pass < 3; pass++) {
        let hasMoreAbove = scrollOffset > 0;
        let maxChoices = maxChoicesFitting(scrollOffset, available, hasMoreAbove, true);
        let hasMoreBelow = scrollOffset + maxChoices < keys.length;
        maxChoices = maxChoicesFitting(scrollOffset, available, hasMoreAbove, hasMoreBelow);
        hasMoreBelow = scrollOffset + maxChoices < keys.length;

        if (cursorChoiceIndex >= scrollOffset + maxChoices) {
          // Scroll down so cursor is the last visible item, then re-pack.
          let used = 0;
          let count = 0;
          const belowEllipsis = cursorChoiceIndex < keys.length - 1 ? ellipsisRows : 0;
          const aboveBudget = available - belowEllipsis;
          for (let i = cursorChoiceIndex; i >= 0; i--) {
            const next = rowCounts[i];
            if (count > 0 && used + next + ellipsisRows > aboveBudget && i > 0) {
              break;
            }
            if (count > 0 && used + next > aboveBudget) {
              break;
            }
            used += next;
            count += 1;
            scrollOffset = i;
          }
          continue;
        }

        if (cursorChoiceIndex < scrollOffset) {
          scrollOffset = cursorChoiceIndex;
          continue;
        }

        return {
          maxChoices,
          hasMoreAbove,
          hasMoreBelow,
        };
      }

      const hasMoreAbove = scrollOffset > 0;
      const maxChoices = maxChoicesFitting(scrollOffset, available, hasMoreAbove, true);
      return {
        maxChoices,
        hasMoreAbove,
        hasMoreBelow: scrollOffset + maxChoices < keys.length,
      };
    };

    const render = () => {
      if (linesPrinted > 0) {
        readline.moveCursor(process.stdout, 0, -linesPrinted);
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);
      }

      const { maxChoices, hasMoreAbove, hasMoreBelow } = getScrollLayout();
      const visibleKeys = keys.slice(scrollOffset, scrollOffset + maxChoices);
      const ellipsis = chalk.yellow('...');

      const lines = [];

      if (question) {
        lines.push(question);
      }

      if (presets.length > 0) {
        lines.push('Presets:');
        presets.forEach((preset, i) => {
          const presetChoices = Array.isArray(preset.choices) ? preset.choices : [preset.choices];
          const titles = presetChoices.map((choice) => resolveTitle(choice)).join(', ');
          const marker = i === cursor ? '>' : ' ';
          const display = `${ marker } [${ preset.key }] ${ titles }`;
          const isCursor = i === cursor;

          lines.push(isCursor ? chalk.bold(display) : display);
        });

        lines.push('');
        lines.push('Choices:');
      }

      if (hasMoreAbove) {
        lines.push(ellipsis);
      }

      visibleKeys.forEach((key, i) => {
        const choiceIndex = scrollOffset + i;
        const { title, isProtected } = enrichedChoices[key];
        const cursorIndex = presets.length + choiceIndex;
        const marker = cursorIndex === cursor ? '>' : ' ';
        const label = isProtected ? `🔒 ${ title }` : title;
        const display = `${ marker } [${ key }] ${ label }`;
        const isSelected = selected.has(key);
        const isCursor = cursorIndex === cursor;

        let line = display;
        if (isProtected) {
          line = chalk.hex('#03fc98')(line); // TODO: Consider dark grey styling
        } else if (isSelected) {
          line = chalk.cyan(line);
        }
        if (isCursor) {
          line = chalk.bold(line);
        }

        lines.push(line);
      });

      if (hasMoreBelow) {
        lines.push(ellipsis);
      }

      lines.push(hintText());

      if (error) {
        lines.push(chalk.red(error));
      }

      lines.push(`Input: ${ buffer }`);

      process.stdout.write(lines.join('\n') + '\n');
      linesPrinted = lines.reduce((sum, line) => sum + visualRows(line), 0);
    };

    const cleanup = () => {
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      leaveAlternateScreen();
    };

    const finish = (value) => {
      cleanup();
      resolve(value);
    };

    const submitSelected = () => {
      if (!skippable && selected.size === 0) {
        error = `You must choose.`;
        buffer = '';
        render();
        return;
      }

      finish(
        [...selected]
          .sort((a, b) => a - b)
          .map((key) => enrichedChoices[key].value)
      );
    };

    const chooseAtCursor = () => {
      if (cursor < presets.length) {
        finish(presets[cursor].choices);
        return;
      }

      const key = keys[cursor - presets.length];
      const choice = enrichedChoices[key];

      if (choice.isProtected) {
        error = `That choice is protected.`;
        render();
        return;
      }

      if (oneChoice) {
        finish(choice.value);
        return;
      }

      if (selected.has(key)) {
        selected.delete(key);
      } else {
        selected.add(key);
      }

      render();
    };

    const toggleChoiceKey = (key) => {
      const choice = enrichedChoices?.[key];

      if (choice === undefined) {
        return `Invalid choice: ${ key }`;
      }

      if (choice.isProtected) {
        return `That choice is protected: ${ key }`;
      }

      if (selected.has(key)) {
        selected.delete(key);
      } else {
        selected.add(key);
      }

      return '';
    };

    const submitBuffer = () => {
      const answer = buffer.trim();

      if (answer === '') {
        submitSelected();
        return;
      }

      if (answer.includes(',')) {
        if (oneChoice) {
          error = `CSV is not supported when oneChoice is set.`;
          buffer = '';
          render();
          return;
        }

        const parts = answer.split(',').map((part) => part.trim());
        const errors = [];

        for (const part of parts) {
          if (part === '') {
            continue;
          }

          const partError = toggleChoiceKey(part);
          if (partError) {
            errors.push(partError);
          }
        }

        buffer = '';
        error = errors.join('; ');
        render();
        return;
      }

      const preset = presets.find((preset) => preset.key === answer);

      if (preset) {
        finish(preset.choices);
        return;
      }

      if (oneChoice) {
        const choice = enrichedChoices?.[answer];

        if (choice === undefined) {
          error = `Invalid choice: ${ answer }`;
          buffer = '';
          render();
          return;
        }

        if (choice.isProtected) {
          error = `That choice is protected.`;
          buffer = '';
          render();
          return;
        }

        finish(choice.value);
        return;
      }

      error = toggleChoiceKey(answer);
      buffer = '';
      render();
    };

    const onKeypress = (str, key) => {
      if (key?.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('cancelled'));
        return;
      }

      if (key?.name === 'up') {
        cursor = Math.max(0, cursor - 1);
        render();
        return;
      }

      if (key?.name === 'down') {
        cursor = Math.min(presets.length + keys.length - 1, cursor + 1);
        render();
        return;
      }

      if (key?.name === 'space') {
        chooseAtCursor();
        return;
      }

      if (key?.name === 'return') {
        submitBuffer();
        return;
      }

      if (key?.name === 'backspace') {
        buffer = buffer.slice(0, -1);
        render();
        return;
      }

      if (str && /^[\x20-\x7e]$/.test(str)) {
        buffer += str;
        error = '';
        render();
      }
    };

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on('keypress', onKeypress);

    enterAlternateScreen();
    render();
  });
};

export default chooseInteractive;

// Demo, only runs when execu ted directly
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  (async () => {
    const result = await chooseInteractive(
      [
        'Tomato',
        'Pineapple',
        'Mushroom',
        'Cheese',
        'Pepperoni',
        'Sausage',
        'Onion',
        'Ham',
        'Olives',
        'Artichoke',
        'Eggplant',
        'Bacon',
        'Jalapeno',
        'Anchovies',
      ],
      {
        question: 'What would you like on your pizza?',
        presets: [
          {
            key: 'hawaiian',
            choices: [
              'Tomato',
              'Cheese',
              'Pineapple',
              'Ham',
            ],
          },
        ],
        protectedChoices: [
          'Olives',
        ],
      },
    );
    console.log('\nResult:', result);
    process.exit(0);
  })().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}