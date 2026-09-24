export interface PracticeLabels {
  title: string;
  intro: string;
  start: string;
  next: string;
  finish: string;
  restart: string;
  play: string;
  listeningInstruction: string;
  clozeInstruction: string;
  correct: string;
  incorrect: string;
  progress: string;
  score: string;
  verdictPerfect: string;
  verdictGood: string;
  verdictFair: string;
  verdictLow: string;
  reviewTitle: string;
}

export const practiceLabels: Record<"en" | "es", PracticeLabels> = {
  en: {
    title: "Practice",
    intro: "Test your listening with the Hebrew examples from this lesson and related ones.",
    start: "Start practice",
    next: "Next",
    finish: "See results",
    restart: "Practice again",
    play: "Play audio",
    listeningInstruction: "Listen and pick what you hear.",
    clozeInstruction: "Listen and fill in the missing word.",
    correct: "Correct!",
    incorrect: "Not quite. The answer is highlighted.",
    progress: "Question {current} of {total}",
    score: "{score} of {total} correct",
    verdictPerfect: "Perfect round. Every answer was right.",
    verdictGood: "Nicely done. Replay the ones you missed below.",
    verdictFair: "Getting there. Replay the ones you missed, then try again.",
    verdictLow: "Re-read the lesson, replay the phrases below, then try again.",
    reviewTitle: "Phrases you missed",
  },
  es: {
    title: "Práctica",
    intro: "Pon a prueba tu comprensión auditiva con los ejemplos en hebreo de esta lección y otras relacionadas.",
    start: "Empezar práctica",
    next: "Siguiente",
    finish: "Ver resultados",
    restart: "Practicar de nuevo",
    play: "Reproducir audio",
    listeningInstruction: "Escucha y elige lo que oíste.",
    clozeInstruction: "Escucha y completa la palabra que falta.",
    correct: "¡Correcto!",
    incorrect: "Casi. La respuesta correcta está resaltada.",
    progress: "Pregunta {current} de {total}",
    score: "{score} de {total} correctas",
    verdictPerfect: "Ronda perfecta. Todas las respuestas fueron correctas.",
    verdictGood: "Bien hecho. Vuelve a escuchar las que fallaste.",
    verdictFair: "Vas bien. Vuelve a escuchar las que fallaste y prueba otra vez.",
    verdictLow: "Relee la lección, escucha las frases de abajo y prueba otra vez.",
    reviewTitle: "Frases que fallaste",
  },
};
