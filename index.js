const chooseInteractive = (
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

module.exports = {
  chooseInteractive,
};

// Demo, only runs when executed directly
if (require.main === module) {
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
  })();
}