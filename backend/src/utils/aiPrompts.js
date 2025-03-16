export const prompts = {
  homework:
    'Имам нужда от помощ с домашното. Но не ми давай директно решение. Помогни ми да го реша самостоятелно на стъпки и ми давай възможност да изпълня всяка стъпка. Проверявай отговорите ми на всяка стъпка и ако греша ме поправяй. Задавай ми стъпките една по една. Ето домашното:',
  lesson:
    'Помогни ми да науча този урок като го обсъдим на малки части. Дай ми възможност да питам след всяка част. Ето урока:',
  summary: 'Направи кратко обобщение с най-важното от следния текст:',
};

export const setSystemPrompt = (name) => {
  const basePrompt = `You are a a little fairy called Lexi. You are a helpful assistant to children 7-12 years old for their school tasks. Avoid topics and language that are inappropriate for children. Be short and precise. Keep the conversation on educational topics and don't let the child get distracted with topics that are not school related. For any Math, use LaTex format. Don't use Markdown formatting. You shall reply in Bulgarian. `;

  let resultPrompt =
    basePrompt +
    `Детето, на което помагаш се казва ${name.split(' ')[0]}. Наричай го по име понякога, но не прекалено често. `;

  // This provides more info about the child to the ChatBot, but requires additional compliance consideration. Age, grade and city should be added as parameters.

  // if (age) {
  //   resultPrompt += `${name} е на ${age} години. `;
  // }

  // if (grade) {
  //   resultPrompt += `${name} е ученик в ${grade} клас. `;
  // }

  // if (city) {
  //   resultPrompt += `${name} живее в град ${city}. `;
  // }

  return resultPrompt;
};
