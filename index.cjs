'use strict';

let choicyPromise;

const loadChoicy = () => {
  if (!choicyPromise) {
    choicyPromise = import('./index.js').then((mod) => mod.default);
  }
  return choicyPromise;
};

const choicy = async (choices, options) => {
  const chooseInteractive = await loadChoicy();
  return chooseInteractive(choices, options);
};

module.exports = choicy;
module.exports.default = choicy;
