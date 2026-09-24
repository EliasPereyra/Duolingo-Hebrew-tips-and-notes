import type { PracticeLabels } from "../constants/practice-labels";
import type { PracticeData, PracticePhrase } from "./practice-data";
import { playAudioFile } from "./audio-player";

const SESSION_SIZE = 8;
const OPTION_COUNT = 4;
const BLANK = "_____";
const NIQQUD = /[\u0591-\u05C7]/g;

interface Question {
  kind: "listening" | "cloze";
  source: PracticePhrase;
  audio: string;
  sentence?: string;
  answer: string;
  options: string[];
}

interface PracticePayload {
  data: PracticeData;
  labels: PracticeLabels;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(text: string) {
  return text.replace(NIQQUD, "");
}

function pickDistractors(candidates: string[], exclude: string[]) {
  const excluded = new Set(exclude.map(normalize));
  return shuffle(candidates.filter((candidate) => !excluded.has(normalize(candidate)))).slice(0, OPTION_COUNT - 1);
}

function buildListening(phrase: PracticePhrase, data: PracticeData): Question {
  const distractors = pickDistractors(data.distractorPhrases, [phrase.hebrew]);
  return {
    kind: "listening",
    source: phrase,
    audio: phrase.audio,
    answer: phrase.hebrew,
    options: shuffle([phrase.hebrew, ...distractors]),
  };
}

function buildCloze(phrase: PracticePhrase, data: PracticeData): Question | null {
  const words = phrase.hebrew.split(" ");
  if (phrase.hebrew.includes(".") || words.length < 2) return null;

  const blankIndex = Math.floor(Math.random() * words.length);
  const answer = words[blankIndex];
  const distractors = pickDistractors(data.distractorWords, words);
  if (distractors.length === 0) return null;

  return {
    kind: "cloze",
    source: phrase,
    audio: phrase.audio,
    sentence: words.map((word, i) => (i === blankIndex ? BLANK : word)).join(" "),
    answer,
    options: shuffle([answer, ...distractors]),
  };
}

function buildSession(data: PracticeData) {
  const phrases = [...shuffle(data.lessonPhrases), ...shuffle(data.poolPhrases)].slice(0, SESSION_SIZE);
  return phrases.map((phrase) => {
    const cloze = Math.random() < 0.5 ? buildCloze(phrase, data) : null;
    return cloze ?? buildListening(phrase, data);
  });
}

function format(template: string, values: Record<string, number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function verdictFor(score: number, total: number, labels: PracticeLabels) {
  const ratio = score / total;
  if (ratio === 1) return labels.verdictPerfect;
  if (ratio >= 0.7) return labels.verdictGood;
  if (ratio >= 0.4) return labels.verdictFair;
  return labels.verdictLow;
}

function cloneTemplate<T extends HTMLElement>(template: HTMLTemplateElement) {
  return template.content.firstElementChild?.cloneNode(true) as T;
}

function initPracticeSection(section: HTMLElement) {
  const $ = <T extends HTMLElement>(selector: string) => section.querySelector<T>(selector);

  const payloadEl = $<HTMLScriptElement>("[data-practice-payload]");
  const optionTemplate = $<HTMLTemplateElement>("[data-option-template]");
  const stepTemplate = $<HTMLTemplateElement>("[data-step-template]");
  const reviewTemplate = $<HTMLTemplateElement>("[data-review-template]");
  const track = $("[data-track]");
  const progress = $("[data-progress]");
  const instruction = $("[data-instruction]");
  const playButton = $<HTMLButtonElement>("[data-play]");
  const sentence = $("[data-sentence]");
  const options = $("[data-options]");
  const feedback = $("[data-feedback]");
  const translation = $("[data-translation]");
  const nextButton = $<HTMLButtonElement>("[data-action='next']");
  const scoreText = $("[data-score]");
  const verdict = $("[data-verdict]");
  const review = $("[data-review]");
  const reviewList = $("[data-review-list]");
  if (
    !payloadEl ||
    !optionTemplate ||
    !stepTemplate ||
    !reviewTemplate ||
    !track ||
    !progress ||
    !instruction ||
    !playButton ||
    !sentence ||
    !options ||
    !feedback ||
    !translation ||
    !nextButton ||
    !scoreText ||
    !verdict ||
    !review ||
    !reviewList
  ) {
    return;
  }

  const { data, labels }: PracticePayload = JSON.parse(payloadEl.textContent ?? "{}");
  const screens = {
    start: $("[data-screen='start']"),
    question: $("[data-screen='question']"),
    result: $("[data-screen='result']"),
  };

  let session: Question[] = [];
  let results: boolean[] = [];
  let current = 0;

  const showScreen = (name: keyof typeof screens) => {
    for (const [key, screen] of Object.entries(screens)) {
      if (screen) screen.hidden = key !== name;
    }
  };

  const step = (index: number) => track.children[index] as HTMLElement | undefined;

  const renderQuestion = () => {
    const question = session[current];
    step(current)?.setAttribute("data-state", "current");
    progress.textContent = format(labels.progress, { current: current + 1, total: session.length });
    instruction.textContent = question.kind === "cloze" ? labels.clozeInstruction : labels.listeningInstruction;
    playButton.dataset.audio = question.audio;
    sentence.hidden = question.kind !== "cloze";
    sentence.textContent = question.sentence ?? "";
    feedback.textContent = "";
    feedback.removeAttribute("data-result");
    translation.hidden = true;
    nextButton.hidden = true;
    nextButton.textContent = current === session.length - 1 ? labels.finish : labels.next;

    options.replaceChildren(
      ...question.options.map((option) => {
        const button = cloneTemplate<HTMLButtonElement>(optionTemplate);
        button.textContent = option;
        button.dataset.option = option;
        return button;
      }),
    );

    playAudioFile(question.audio);
  };

  const answer = (button: HTMLButtonElement) => {
    const question = session[current];
    const isCorrect = button.dataset.option === question.answer;
    results[current] = isCorrect;
    step(current)?.setAttribute("data-state", isCorrect ? "correct" : "incorrect");

    for (const option of options.querySelectorAll<HTMLButtonElement>("button")) {
      option.disabled = true;
      if (option.dataset.option === question.answer) option.dataset.state = "correct";
    }
    if (!isCorrect) button.dataset.state = "incorrect";

    feedback.textContent = isCorrect ? labels.correct : labels.incorrect;
    feedback.dataset.result = isCorrect ? "correct" : "incorrect";

    const { hebrew, translit, gloss } = question.source;
    if (gloss) {
      translation.textContent = [hebrew, translit, `“${gloss}”`].filter(Boolean).join(" · ");
      translation.hidden = false;
    }
    nextButton.hidden = false;
    nextButton.focus();
  };

  const showResults = () => {
    const score = results.filter(Boolean).length;
    scoreText.textContent = format(labels.score, { score, total: session.length });
    verdict.textContent = verdictFor(score, session.length, labels);

    const missed = session.filter((_, i) => !results[i]).map((question) => question.source);
    reviewList.replaceChildren(
      ...missed.map(({ hebrew, audio, gloss }) => {
        const item = cloneTemplate<HTMLLIElement>(reviewTemplate);
        const play = item.querySelector<HTMLButtonElement>("button");
        const [hebrewText, glossText] = item.querySelectorAll("p");
        if (play) play.dataset.audio = audio;
        hebrewText.textContent = hebrew;
        glossText.textContent = gloss ?? "";
        glossText.hidden = !gloss;
        return item;
      }),
    );
    review.hidden = missed.length === 0;

    showScreen("result");
    scoreText.focus();
  };

  const start = () => {
    session = buildSession(data);
    results = [];
    current = 0;
    track.replaceChildren(...session.map(() => cloneTemplate(stepTemplate)));
    track.hidden = false;
    showScreen("question");
    renderQuestion();
  };

  section.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const option = target.closest<HTMLButtonElement>("[data-option]");
    if (option && !option.disabled) return answer(option);

    const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action === "start" || action === "restart") return start();
    if (action === "next") {
      current++;
      if (current < session.length) return renderQuestion();
      showResults();
    }
  });
}

export function initPractice() {
  document.querySelectorAll<HTMLElement>("[data-practice]").forEach(initPracticeSection);
}
