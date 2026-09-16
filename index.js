import readline from 'readline';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

export const chooseInteractive = async (
  choices,
  {
    question,
    titleProp,
    valueProp,
    oneChoice = false,
    skippable = false,
    index0 = false,
  } = {},
) => {

  const resolveTitle = (choice) => {
    if (typeof choice === 'string') {
      return choice;
    }
    
    return choice?.[titleProp] 
      || choice?.title 
      || choice?.name 
      || choice?.id 
      || `${ JSON.stringify(choice).slice(0, 30) }…`
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
    };
    startingIndex++;
  }

  const keys = Object.keys(enrichedChoices);
  const selected = new Set();
  let cursor = 0;
  let buffer = '';
  let error = '';
  let linesPrinted = 0;

  return new Promise((resolve, reject) => {

    const render = () => {
      if (linesPrinted > 0) {
        readline.moveCursor(process.stdout, 0, -linesPrinted);
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);
      }

      const lines = [];

      if (question) {
        lines.push(question);
      }

      keys.forEach((key, i) => {
        const { title } = enrichedChoices[key];
        const marker = i === cursor ? '>' : ' ';
        const display = `${ marker } [${ key }] ${ title }`;
        const isSelected = selected.has(key);
        const isCursor = i === cursor;

        let line = display;
        if (isSelected) {
          line = chalk.cyan(line);
        }
        if (isCursor) {
          line = chalk.bold(line);
        }

        lines.push(line);
      });

      const hint = oneChoice
        ? `Type a number or use arrows + Space to choose.`
        : `Type a number or use arrows + Space to toggle. Press Enter when done.`;
      lines.push(hint);

      if (error) {
        lines.push(chalk.red(error));
      }

      lines.push(`Input: ${ buffer }`);

      process.stdout.write(lines.join('\n') + '\n');
      linesPrinted = lines.length;
    };

    const cleanup = () => {
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
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
      const key = keys[cursor];
      const choice = enrichedChoices[key];

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

    const submitBuffer = () => {
      const answer = buffer.trim();

      if (answer === '') {
        submitSelected();
        return;
      }

      const selectedChoice = enrichedChoices?.[answer];

      if (selectedChoice === undefined) {
        error = `Invalid choice: ${ answer }`;
        buffer = '';
        render();
        return;
      }

      if (oneChoice) {
        finish(selectedChoice.value);
        return;
      }

      if (selected.has(answer)) {
        selected.delete(answer);
      } else {
        selected.add(answer);
      }

      buffer = '';
      error = '';
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
        cursor = Math.min(keys.length - 1, cursor + 1);
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

      if (str && /^[0-9]$/.test(str)) {
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

    render();
  });
};

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
        oneChoice: true,
        index0: true,
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
      },
    );
    console.log('\nResult:', result);
    process.exit(0);
  })().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}