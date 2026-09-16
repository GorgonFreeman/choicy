import readline from 'readline';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

const ask = (prompt) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    const onSigint = () => {
      rl.close();
      reject(new Error('cancelled'));
    };

    rl.on('SIGINT', onSigint);

    rl.question(prompt, (answer) => {
      rl.off('SIGINT', onSigint);
      rl.close();
      resolve(answer);
    });
  });
};

export const chooseInteractive = async (
  choices,
  {
    question,
    titleProp,
    valueProp,
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
      || `${JSON.stringify(choice).slice(0, 30)}…`
    ;
  };

  const resolveValue = (choice) => {
    return choice?.[valueProp] 
      || choice 
    ;
  };

  const enrichedChoices = {};
  let startingIndex = 1;
  for (const choice of choices) {
    const title = resolveTitle(choice);
    const value = resolveValue(choice);
    enrichedChoices[startingIndex] = {
      title, 
      value, 
    };
    startingIndex++;
  }

  const selected = new Set();

  while (true) {
    const lines = [];

    if (question) {
      lines.push(question);
    }

    for (const [key, choice] of Object.entries(enrichedChoices)) {
      const { title, value } = choice;
      const display = `[${ key }] ${ title }`;
      const isSelected = selected.has(key);

      if (isSelected) {
        lines.push(chalk.cyan(display));
        continue;
      }
      
      lines.push(display);
    }

    const hint = `Submit a number to toggle. Press Enter when done.`;
    lines.push(hint);

    const inputPrompt = `Input: `;
    lines.push(inputPrompt);

    const answer = (await ask(lines.join('\n'))).trim();

    // Submit selected choices if no input
    if (answer === '') {
      return [...selected]
        .sort((a, b) => a - b)
        .map((i) => enrichedChoices[i].value);
    }

    const selectedChoice = enrichedChoices?.[answer];

    if (selectedChoice === undefined) {
      console.error(chalk.red(`Invalid choice: ${ answer }`));
      continue;
    }

    if (selected.has(answer)) {
      selected.delete(answer);
      continue;
    }
  
    selected.add(answer);
  }
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
