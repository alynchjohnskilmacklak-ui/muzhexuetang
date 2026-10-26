import type { PracticeQuestion } from '../parent-practice-bank'

type QuestionRevision = Partial<PracticeQuestion>

function englishSpaceSource(id: string) {
  return '牧哲学堂原创拓展题/河北中考题型参考2026/英语/九年级全一册/Unit6BeyondEarth/SectionA#' + id + '；原创阅读材料与设问，题型参考2026年河北省初中学业水平考试英语试题：https://jx.panqjy.cn/doc-18761409.html'
}

const spaceClubPassage = 'Our science club built a model of the solar system for younger students. Earth is a planet that moves around the Sun, and the Moon moves around Earth. A star gives off its own light, while a planet reflects light from a star. The universe contains many stars and planets. We used a small spacecraft model to explain how scientists collect information in space. We also discussed whether there may be life on other planets. Our teacher reminded us that a question is not proof. We all left wanting to learn more and protect Earth.'

/**
 * Unit 6 Beyond Earth, Section A. All ten revisions preserve the original
 * knowledgePointId "space" while replacing template prompts with reading,
 * contextual language use, data expression, and a short composition.
 */
export const languageZhongkaoQuestionRevisions2026C: Record<string, QuestionRevision> = {
  'english-9-6-1-q1': {
    type: 'single_choice',
    knowledgePointId: 'space',
    prompt: 'Read the passage and choose the best title.\n\n' + spaceClubPassage + '\n\nWhat is the passage mainly about?',
    options: ['A science club project that helps students learn about space', 'A report proving that life exists on another planet', 'A plan to send younger students into space', 'A story about how the Moon gives off its own light'],
    answerIndex: 0,
    explanation: 'The club makes a model, explains several space facts, and encourages students to learn more. The passage explicitly says that a question is not proof, so it does not claim that life has been found elsewhere. The Moon also reflects sunlight rather than producing its own light.',
    difficulty: 'MEDIUM',
    sourceRef: englishSpaceSource('q1-reading-for-main-idea'),
  },
  'english-9-6-1-q2': {
    type: 'multiple_choice',
    knowledgePointId: 'space',
    prompt: 'Read the passage and choose all the statements supported by it.\n\n' + spaceClubPassage,
    options: ['Earth is a planet that moves around the Sun.', 'The Moon moves around the Sun.', 'A star gives off its own light.', 'The club has proved that there is life on another planet.'],
    answerIndices: [0, 2],
    explanation: 'The passage directly states that Earth moves around the Sun and that a star gives off its own light. It says the Moon moves around Earth, not the Sun. The students discuss whether life may exist, but their discussion is not proof.',
    difficulty: 'MEDIUM',
    sourceRef: englishSpaceSource('q2-reading-for-details'),
  },
  'english-9-6-1-q3': {
    type: 'fill_blank',
    knowledgePointId: 'space',
    prompt: 'Complete the sentence with words from the passage: Earth is a ______, and the ______ contains many stars and planets.',
    correctAnswer: 'planet; universe',
    acceptedAnswers: ['planet; universe', 'planet, universe', 'planet / universe'],
    gradingMode: 'exact',
    explanation: 'The first blank names Earth’s type: a planet. The second names the larger space that contains many stars and planets: the universe.',
    difficulty: 'MEDIUM',
    sourceRef: englishSpaceSource('q3-space-vocabulary-in-context'),
  },
  'english-9-6-1-q4': {
    type: 'fill_blank',
    knowledgePointId: 'space',
    prompt: 'Complete the science-club note: The Moon moves around ______.',
    correctAnswer: 'the Earth',
    acceptedAnswers: ['the Earth', 'Earth'],
    gradingMode: 'exact',
    explanation: 'The Moon moves around Earth. In English, both “the Earth” and “Earth” are used for the planet’s name, so either is accepted here.',
    difficulty: 'MEDIUM',
    sourceRef: englishSpaceSource('q4-earth-moon-relationship'),
  },
  'english-9-6-1-q5': {
    type: 'fill_blank',
    knowledgePointId: 'space',
    prompt: 'Complete the sentence with the correct preposition: Scientists have sent spacecraft ______ space to collect information.',
    correctAnswer: 'into',
    acceptedAnswers: ['into'],
    gradingMode: 'exact',
    explanation: '“Into space” describes movement from outside to inside space. “On,” “at,” and “of” do not express that direction in this sentence.',
    difficulty: 'MEDIUM',
    sourceRef: englishSpaceSource('q5-preposition-into-space'),
  },
  'english-9-6-1-q6': {
    type: 'short_answer',
    knowledgePointId: 'space',
    prompt: 'Information card: Age of the Earth — about 4.6 billion years. Write one question with “how old” and answer it in a complete sentence.',
    correctAnswer: 'How old is the Earth? It is about 4.6 billion years old. Accept: “How old is Earth? Earth is about 4.6 billion years old.”',
    acceptedAnswers: ['How old is the Earth? It is about 4.6 billion years old.', 'How old is Earth? Earth is about 4.6 billion years old.', 'How old is the Earth? The Earth is about 4.6 billion years old.'],
    gradingMode: 'self_check',
    explanation: 'Ask about age with “How old is ...?” and answer with “... is about 4.6 billion years old.” The information card gives an approximate age, so “about” should be retained or an equivalent approximation used.',
    difficulty: 'MEDIUM',
    sourceRef: englishSpaceSource('q6-how-old-question-and-answer'),
  },
  'english-9-6-1-q7': {
    type: 'single_choice',
    knowledgePointId: 'space',
    prompt: 'Choose the word that completes the sentence: The science club visited a planetarium ______ students could see a model of the solar system.',
    options: ['where', 'when', 'who', 'which'],
    answerIndex: 0,
    explanation: '“Planetarium” is a place, and the clause explains what happened there, so the relative adverb “where” is correct. “When” refers to time; “who” refers to people; “which” would need a suitable role in the clause.',
    difficulty: 'MEDIUM',
    sourceRef: englishSpaceSource('q7-relative-adverb-where'),
  },
  'english-9-6-1-q8': {
    type: 'fill_blank',
    knowledgePointId: 'space',
    prompt: 'Complete the distance expression: The Moon is about 384,000 kilometers ______ the Earth.',
    correctAnswer: 'away from',
    acceptedAnswers: ['away from'],
    gradingMode: 'exact',
    explanation: 'The pattern is “a distance + away from + place.” Here, “384,000 kilometers away from the Earth” expresses the approximate distance.',
    difficulty: 'MEDIUM',
    sourceRef: englishSpaceSource('q8-distance-expression'),
  },
  'english-9-6-1-q9': {
    type: 'short_answer',
    knowledgePointId: 'space',
    prompt: 'A class survey asked whether there may be life on other planets. Results: “Yes, there may be life” — 12 students; “Not sure” — 10 students; “No, there is no life outside Earth” — 2 students. Write two English sentences reporting the results. Use “life” correctly in at least one sentence.',
    correctAnswer: 'Example: Twelve students think there may be life on other planets. Ten students are not sure, while two think there is no life outside Earth. Scoring points: ① reports the largest group correctly (1 point); ② reports at least one other number accurately (1 point); ③ uses “life” with a singular verb, such as “there is life” (1 point). “Life” is uncountable in this meaning.',
    acceptedAnswers: ['Twelve students think there may be life on other planets. Ten are not sure, while two think there is no life outside Earth.', 'There may be life on other planets, according to twelve students. Ten are unsure, and two believe there is no life outside Earth.'],
    gradingMode: 'self_check',
    explanation: 'The chart shows 12, 10, and 2 students in the three groups. “Life” means living things in general here and is uncountable, so use “there is life,” not “there are life.” Responses may use “believe,” “think,” or “say” if the numbers and meaning remain accurate.',
    difficulty: 'EXAM',
    sourceRef: englishSpaceSource('q9-data-description-and-life'),
  },
  'english-9-6-1-q10': {
    type: 'short_answer',
    knowledgePointId: 'space',
    prompt: 'Writing task: Your school English newsletter is collecting short paragraphs about space exploration and life on Earth. Information card: spacecraft help scientists collect information about the universe; satellites support weather forecasts and communication; Earth is our home. Write 60–80 words. Give your opinion, use at least two facts from the card, and include one action students can take to protect Earth.',
    correctAnswer: 'Example (80 words): I think space exploration is useful, but we should also protect Earth. Spacecraft help scientists learn about the universe and other planets. Satellites give us weather information and help people communicate. These discoveries can make life safer and answer questions. However, exploring space needs time, money and planning. Students can learn, ask questions and share ideas. At the same time we should save energy and keep our planet clean. Earth is our home so exploration and protection should go together.\n\nSelf-check rubric (6 points): ① 60–80 words (1); ② states a clear opinion (1); ③ uses at least two accurate facts from the information card (1); ④ gives one specific action to protect Earth (1); ⑤ uses relevant space vocabulary, such as “spacecraft,” “universe,” “satellite,” or “planet” (1); ⑥ ideas are connected and sentences are understandable and grammatically controlled (1). Other original paragraphs meeting the same points are acceptable.',
    acceptedAnswers: ['Spacecraft help scientists collect information about space.', 'Satellites support weather forecasts and communication.', 'Students can save energy, reduce waste, or keep the local environment clean.'],
    gradingMode: 'self_check',
    explanation: 'A strong paragraph answers the prompt rather than listing vocabulary: it states a view, supports it with at least two facts, and ends with a practical responsibility. Check the 60–80-word limit, verb forms, sentence links, and whether the suggested action is something students can do.',
    difficulty: 'EXAM',
    sourceRef: englishSpaceSource('q10-60-to-80-word-space-paragraph'),
  },
}
