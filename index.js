import { pathToFileURL } from 'url';

export const chooseInteractive = (
  choices,
  {
    question,
    titleProp,
    valueProp,
    index0,
    oneChoice = false,
    presets = [],
  } = {},
) => {
  return true;
};

// Demo, only runs when executed directly
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
