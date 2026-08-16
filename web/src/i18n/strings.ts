/**
 * Every user-facing string in the app.
 *
 * The strings themselves live in `locales/*.json` as a flat map of dotted keys
 * to templates (`"common.minutes": "{n} min"`). English is the source of truth
 * and every other locale is generated from it by `scripts/gen-locales.mjs`.
 *
 * This module turns the flat dictionary back into the nested, typed shape the
 * components read (`t.common.minutes(5)`), so adding a locale never touches a
 * call site. Anything a locale is missing falls back to the English template
 * rather than rendering a raw key.
 *
 * All locales are bundled eagerly. That costs a few tens of KB gzipped and buys
 * a synchronous `t` with no loading state and no network — which is the whole
 * promise of an app that claims to run on-device.
 */

import bn from './locales/bn.json';
import en from './locales/en.json';
import es from './locales/es.json';
import ha from './locales/ha.json';
import hi from './locales/hi.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import zh from './locales/zh.json';

export type MessageKey = keyof typeof en;
type Dict = Partial<Record<MessageKey, string>>;

/** Keyed by the same codes the backend returns from `/curriculum/languages`. */
const DICTS: Record<string, Dict> = { en, bn, hi, zh, es, id, ms, ha };

export const LOCALE_CODES = Object.keys(DICTS);

function build(dict: Dict) {
  /** Look up a template, falling back to English, then to the key itself. */
  const s = (key: MessageKey): string => dict[key] ?? en[key] ?? key;

  /** `fill('Step {n}', {n: 3})` -> `'Step 3'`. Unknown tokens are left alone. */
  const fill = (template: string, vars: Record<string, string | number>): string =>
    template.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in vars ? String(vars[name]) : whole,
    );

  /**
   * English-style one/other. Locales without a singular/plural split simply
   * carry the same text in both slots, which reads correctly for bn, zh, id,
   * ms and ha alike.
   */
  const plural = (base: string, n: number): string =>
    fill(s(`${base}.${n === 1 ? 'one' : 'other'}` as MessageKey), { n });

  return {
    app: {
      name: s('app.name'),
      tagline: s('app.tagline'),
      offlineBadge: s('app.offlineBadge'),
      offlineCaption: s('app.offlineCaption'),
      offlineTooltip: s('app.offlineTooltip'),
    },

    nav: {
      dashboard: s('nav.dashboard'),
      catalog: s('nav.catalog'),
      practice: s('nav.practice'),
      progress: s('nav.progress'),
      settings: s('nav.settings'),
      tutor: s('nav.tutor'),
      teach: s('nav.teach'),
      notebook: s('nav.notebook'),
      sectionLearn: s('nav.sectionLearn'),
      sectionTeach: s('nav.sectionTeach'),
      sectionYou: s('nav.sectionYou'),
      collapse: s('nav.collapse'),
      expand: s('nav.expand'),
      toggleTheme: s('nav.toggleTheme'),
    },

    common: {
      retry: s('common.retry'),
      cancel: s('common.cancel'),
      confirm: s('common.confirm'),
      close: s('common.close'),
      back: s('common.back'),
      next: s('common.next'),
      previous: s('common.previous'),
      continue: s('common.continue'),
      start: s('common.start'),
      startLesson: s('common.startLesson'),
      resume: s('common.resume'),
      done: s('common.done'),
      loading: s('common.loading'),
      minutes: (n: number) => fill(s('common.minutes'), { n }),
      lessons: (n: number) => plural('common.lessons', n),
      units: (n: number) => plural('common.units', n),
      of: s('common.of'),
      complete: s('common.complete'),
      completed: s('common.completed'),
      inProgress: s('common.inProgress'),
      notStarted: s('common.notStarted'),
      locked: s('common.locked'),
      optional: s('common.optional'),
      beta: s('common.beta'),
      comingSoon: s('common.comingSoon'),
    },

    errors: {
      title: s('errors.title'),
      generic: s('errors.generic'),
      offline: s('errors.offline'),
      offlineHint: (url: string) => fill(s('errors.offlineHint'), { url }),
      notFoundTitle: s('errors.notFoundTitle'),
      notFoundBody: s('errors.notFoundBody'),
      subjectNotFound: s('errors.subjectNotFound'),
      lessonNotFound: s('errors.lessonNotFound'),
    },

    empty: {
      subjects: s('empty.subjects'),
      subjectsBody: s('empty.subjectsBody'),
      lessons: s('empty.lessons'),
      questions: s('empty.questions'),
      questionsBody: s('empty.questionsBody'),
      lessonContent: s('empty.lessonContent'),
      lessonContentBody: s('empty.lessonContentBody'),
      progress: s('empty.progress'),
      progressBody: s('empty.progressBody'),
    },

    dashboard: {
      greetingMorning: s('dashboard.greetingMorning'),
      greetingAfternoon: s('dashboard.greetingAfternoon'),
      greetingEvening: s('dashboard.greetingEvening'),
      subtitle: s('dashboard.subtitle'),
      continueLearning: s('dashboard.continueLearning'),
      continueEmpty: s('dashboard.continueEmpty'),
      continueEmptyBody: s('dashboard.continueEmptyBody'),
      browseCourses: s('dashboard.browseCourses'),
      overallProgress: s('dashboard.overallProgress'),
      lessonsCompleted: s('dashboard.lessonsCompleted'),
      streak: s('dashboard.streak'),
      streakBody: (n: number) =>
        n > 0 ? fill(s('dashboard.streakBody.some'), { n }) : s('dashboard.streakBody.zero'),
      minutesLearned: s('dashboard.minutesLearned'),
      masteryBySubject: s('dashboard.masteryBySubject'),
      nextUp: s('dashboard.nextUp'),
      nextUpBody: s('dashboard.nextUpBody'),
      quickPractice: s('dashboard.quickPractice'),
      quickPracticeBody: s('dashboard.quickPracticeBody'),
      askAnything: s('dashboard.askAnything'),
      askAnythingBody: s('dashboard.askAnythingBody'),
    },

    catalog: {
      title: s('catalog.title'),
      subtitle: s('catalog.subtitle'),
      exams: s('catalog.exams'),
      open: s('catalog.open'),
    },

    course: {
      unitsTitle: s('course.unitsTitle'),
      overview: s('course.overview'),
      aboutThisCourse: s('course.aboutThisCourse'),
      aboutBody: s('course.aboutBody'),
      chapter: s('course.chapter'),
      class: s('course.class'),
      selectLesson: s('course.selectLesson'),
      selectLessonBody: s('course.selectLessonBody'),
      yourProgress: s('course.yourProgress'),
      practiceThisSubject: s('course.practiceThisSubject'),
      searchPlaceholder: s('course.searchPlaceholder'),
      noMatches: s('course.noMatches'),
      clearFilter: s('course.clearFilter'),
    },

    lesson: {
      objectives: s('lesson.objectives'),
      steps: s('lesson.steps'),
      keyFormulas: s('lesson.keyFormulas'),
      commonMistakes: s('lesson.commonMistakes'),
      realWorld: s('lesson.realWorld'),
      concepts: s('lesson.concepts'),
      markComplete: s('lesson.markComplete'),
      markedComplete: s('lesson.markedComplete'),
      nextLesson: s('lesson.nextLesson'),
      prevLesson: s('lesson.prevLesson'),
      backToCourse: s('lesson.backToCourse'),
      stepLabel: (n: number) => fill(s('lesson.stepLabel'), { n }),
      stepActive: s('lesson.stepActive'),
      stepTypes: {
        intro: s('lesson.stepTypes.intro'),
        concept: s('lesson.stepTypes.concept'),
        teach: s('lesson.stepTypes.teach'),
        practice: s('lesson.stepTypes.practice'),
        mastery: s('lesson.stepTypes.mastery'),
      } as Record<string, string>,
      stepHints: {
        intro: s('lesson.stepHints.intro'),
        concept: s('lesson.stepHints.concept'),
        teach: s('lesson.stepHints.teach'),
        practice: s('lesson.stepHints.practice'),
        mastery: s('lesson.stepHints.mastery'),
      } as Record<string, string>,
      tutorPanelTitle: s('lesson.tutorPanelTitle'),
      tutorPanelSubtitle: s('lesson.tutorPanelSubtitle'),
      resizeHandle: s('lesson.resizeHandle'),
    },

    tutor: {
      title: s('tutor.title'),
      subtitle: s('tutor.subtitle'),
      placeholder: s('tutor.placeholder'),
      placeholderFree: s('tutor.placeholderFree'),
      send: s('tutor.send'),
      stop: s('tutor.stop'),
      clear: s('tutor.clear'),
      thinking: s('tutor.thinking'),
      loadingModel: s('tutor.loadingModel'),
      suggestedPrompts: s('tutor.suggestedPrompts'),
      emptyTitle: s('tutor.emptyTitle'),
      emptyBody: s('tutor.emptyBody'),
      emptyBodyLesson: s('tutor.emptyBodyLesson'),
      you: s('tutor.you'),
      sensei: s('tutor.sensei'),
      errorPrefix: s('tutor.errorPrefix'),
      retryTurn: s('tutor.retryTurn'),
      sessionLabel: s('tutor.sessionLabel'),
      modelLabel: s('tutor.modelLabel'),
      stopped: s('tutor.stopped'),
      attach: s('tutor.attach'),
      scrollToLatest: s('tutor.scrollToLatest'),
      readingWork: s('tutor.readingWork'),
      composerHint: s('tutor.composerHint'),
      /**
       * Openers the student sends, so they have to be in the student's
       * language -- an English suggestion chip under a Chinese UI would put
       * the tutor into the wrong language on the very first turn.
       */
      prompts: [s('tutor.prompt1'), s('tutor.prompt2'), s('tutor.prompt3'), s('tutor.prompt4')],
      promptHardest: (subject: string) => fill(s('tutor.promptHardest'), { subject }),
    },

    handwriting: {
      title: s('handwriting.title'),
      subtitle: s('handwriting.subtitle'),
      drop: s('handwriting.drop'),
      or: s('handwriting.or'),
      browse: s('handwriting.browse'),
      accepted: s('handwriting.accepted'),
      remove: s('handwriting.remove'),
      tooLarge: s('handwriting.tooLarge'),
      wrongType: s('handwriting.wrongType'),
      notWiredTitle: s('handwriting.notWiredTitle'),
      notWiredBody: s('handwriting.notWiredBody'),
      notWiredShort: s('handwriting.notWiredShort'),
      sendAnyway: s('handwriting.sendAnyway'),
      requiresVision: s('handwriting.requiresVision'),
      insert: s('handwriting.insert'),
    },

    tools: {
      label: s('tools.label'),
      calculator: s('tools.calculator'),
      scratchpad: s('tools.scratchpad'),
      image: s('tools.image'),
    },

    calc: {
      title: s('calc.title'),
      subtitle: s('calc.subtitle'),
      basic: s('calc.basic'),
      scientific: s('calc.scientific'),
      radians: s('calc.radians'),
      insert: s('calc.insert'),
      clearAll: s('calc.clearAll'),
      backspace: s('calc.backspace'),
    },

    scratch: {
      title: s('scratch.title'),
      subtitle: s('scratch.subtitle'),
      pen: s('scratch.pen'),
      line: s('scratch.line'),
      rectangle: s('scratch.rectangle'),
      circle: s('scratch.circle'),
      triangle: s('scratch.triangle'),
      arrow: s('scratch.arrow'),
      eraser: s('scratch.eraser'),
      color: s('scratch.color'),
      width: s('scratch.width'),
      undo: s('scratch.undo'),
      clear: s('scratch.clear'),
      clearConfirm: s('scratch.clearConfirm'),
      download: s('scratch.download'),
      send: s('scratch.send'),
      empty: s('scratch.empty'),
      sendNote: s('scratch.sendNote'),
      notWired: s('scratch.notWired'),
      insert: s('scratch.insert'),
      insertChat: s('scratch.insertChat'),
      notWiredNotebook: s('scratch.notWiredNotebook'),
      zoomIn: s('scratch.zoomIn'),
      zoomOut: s('scratch.zoomOut'),
      zoomFit: s('scratch.zoomFit'),
    },

    attempt: {
      current: (n: number) => fill(s('attempt.current'), { n }),
      recording: s('attempt.recording'),
      replay: s('attempt.replay'),
      replayNth: (n: number) => fill(s('attempt.replayNth'), { n }),
      startNew: s('attempt.startNew'),
    },

    tour: {
      start: s('tour.start'),
      skip: s('tour.skip'),
      next: s('tour.next'),
      done: s('tour.done'),
      practiceTitle: s('tour.practiceTitle'),
      practiceBody: s('tour.practiceBody'),
      notebookTitle: s('tour.notebookTitle'),
      notebookBody: s('tour.notebookBody'),
      tutorTitle: s('tour.tutorTitle'),
      tutorBody: s('tour.tutorBody'),
      owlTitle: s('tour.owlTitle'),
      owlBody: s('tour.owlBody'),
      teachTitle: s('tour.teachTitle'),
      teachBody: s('tour.teachBody'),
      recordTitle: s('tour.recordTitle'),
      recordBody: s('tour.recordBody'),
    },

    coach: {
      ask: s('coach.ask'),
      looking: s('coach.looking'),
      lookAt: s('coach.lookAt'),
      discuss: s('coach.discuss'),
      failed: s('coach.failed'),
      lookAtMyWork: s('coach.lookAtMyWork'),
      noSurface: s('coach.noSurface'),
      noWorkSurface: s('coach.noWorkSurface'),
      nothingToSee: s('coach.nothingToSee'),
      threadEmpty: s('coach.threadEmpty'),
      dragHint: s('coach.dragHint'),
      readingLabel: s('coach.readingLabel'),
    },

    replay: {
      recording: s('replay.recording'),
      paused: s('replay.paused'),
      startHint: s('replay.startHint'),
      stopHint: s('replay.stopHint'),
      open: s('replay.open'),
      title: s('replay.title'),
      subtitle: s('replay.subtitle'),
      play: s('replay.play'),
      clear: s('replay.clear'),
      showSensei: s('replay.showSensei'),
      looking: s('replay.looking'),
      senseiSaw: s('replay.senseiSaw'),
      empty: s('replay.empty'),
      frameCount: (n: number) => plural('replay.frameCount', n),
      visionFailed: s('replay.visionFailed'),
      visionPrompt: s('replay.visionPrompt'),
      insert: s('replay.insert'),
      insertedWork: s('replay.insertedWork'),
    },

    landing: {
      tagline: s('landing.tagline'),
      problem: s('landing.problem'),
      built: s('landing.built'),
      start: s('landing.start'),
      ask: s('landing.ask'),
      p1: s('landing.p1'),
      p1body: s('landing.p1body'),
      p2: s('landing.p2'),
      p2body: s('landing.p2body'),
      p3: s('landing.p3'),
      p3body: s('landing.p3body'),
      p4: s('landing.p4'),
      p4body: s('landing.p4body'),
      spark: s('landing.spark'),
    },

    addq: {
      button: s('addq.button'),
      title: s('addq.title'),
      subtitle: s('addq.subtitle'),
      rough: s('addq.rough'),
      roughPlaceholder: s('addq.roughPlaceholder'),
      autoSubject: s('addq.autoSubject'),
      photo: s('addq.photo'),
      finalise: s('addq.finalise'),
      working: s('addq.working'),
      another: s('addq.another'),
      problem: s('addq.problem'),
      answer: s('addq.answer'),
      steps: s('addq.steps'),
      commonMistake: s('addq.commonMistake'),
    },

    subjects: {
      physics: s('subjects.physics'),
      chemistry: s('subjects.chemistry'),
      math: s('subjects.math'),
      biology: s('subjects.biology'),
    },

    teach: {
      title: s('teach.title'),
      subtitle: s('teach.subtitle'),
      tabGrade: s('teach.tabGrade'),
      tabBench: s('teach.tabBench'),
      drop: s('teach.drop'),
      accepts: s('teach.accepts'),
      rubric: s('teach.rubric'),
      rubricPlaceholder: s('teach.rubricPlaceholder'),
      grade: s('teach.grade'),
      grading: s('teach.grading'),
      emptyTitle: s('teach.emptyTitle'),
      emptyBody: s('teach.emptyBody'),
      aiGraded: s('teach.aiGraded'),
      strengths: s('teach.strengths'),
      nextSteps: s('teach.nextSteps'),
      benchTitle: s('teach.benchTitle'),
      benchSource: s('teach.benchSource'),
      benchPick: s('teach.benchPick'),
      benchPickBody: s('teach.benchPickBody'),
      groundTruth: s('teach.groundTruth'),
      groundTruthBody: s('teach.groundTruthBody'),
      benchFailed: s('teach.benchFailed'),
      benchMissing: s('teach.benchMissing'),
      benchMissingBody: s('teach.benchMissingBody'),
    },

    phone: {
      usePhone: s('phone.usePhone'),
      drawTitle: s('phone.drawTitle'),
      drawBody: s('phone.drawBody'),
      photoTitle: s('phone.photoTitle'),
      photoBody: s('phone.photoBody'),
      waiting: s('phone.waiting'),
      received: s('phone.received'),
      timeout: s('phone.timeout'),
      header: s('phone.header'),
      takePhoto: s('phone.takePhoto'),
      retake: s('phone.retake'),
      send: s('phone.send'),
      sending: s('phone.sending'),
      sentTitle: s('phone.sentTitle'),
      sentBody: s('phone.sentBody'),
      sendAnother: s('phone.sendAnother'),
      sendFailed: s('phone.sendFailed'),
      noCode: s('phone.noCode'),
    },

    notebook: {
      title: s('notebook.title'),
      subtitle: s('notebook.subtitle'),
      titlePlaceholder: s('notebook.titlePlaceholder'),
      addNote: s('notebook.addNote'),
      addSketch: s('notebook.addSketch'),
      addImage: s('notebook.addImage'),
      uploadError: s('notebook.uploadError'),
      notePlaceholder: s('notebook.notePlaceholder'),
      empty: s('notebook.empty'),
      emptyBody: s('notebook.emptyBody'),
      deleteBlock: s('notebook.deleteBlock'),
      moveUp: s('notebook.moveUp'),
      moveDown: s('notebook.moveDown'),
      editHint: s('notebook.editHint'),
      editSketch: s('notebook.editSketch'),
      done: s('notebook.done'),
      askSensei: s('notebook.askSensei'),
      attach: s('notebook.attach'),
      attachHint: s('notebook.attachHint'),
      clearAll: s('notebook.clearAll'),
      clearConfirm: s('notebook.clearConfirm'),
      saved: s('notebook.saved'),
      library: s('notebook.library'),
      librarySubtitle: s('notebook.librarySubtitle'),
      libraryEmptyBody: s('notebook.libraryEmptyBody'),
      newPage: s('notebook.newPage'),
      untitled: s('notebook.untitled'),
      blockCount: (n: number) => plural('notebook.blockCount', n),
      fromLesson: s('notebook.fromLesson'),
      fromPractice: s('notebook.fromPractice'),
      freePage: s('notebook.freePage'),
      open: s('notebook.open'),
      openForProblem: s('notebook.openForProblem'),
    },

    practice: {
      title: s('practice.title'),
      subtitle: s('practice.subtitle'),
      subject: s('practice.subject'),
      allSubjects: s('practice.allSubjects'),
      count: s('practice.count'),
      startSet: s('practice.startSet'),
      newSet: s('practice.newSet'),
      questionOf: (a: number, b: number) => fill(s('practice.questionOf'), { a, b }),
      check: s('practice.check'),
      nextQuestion: s('practice.nextQuestion'),
      finish: s('practice.finish'),
      correct: s('practice.correct'),
      incorrect: s('practice.incorrect'),
      correctBody: s('practice.correctBody'),
      incorrectBody: s('practice.incorrectBody'),
      correctAnswerWas: (opt: string) => fill(s('practice.correctAnswerWas'), { opt }),
      askWhy: s('practice.askWhy'),
      askWhyShort: s('practice.askWhyShort'),
      yourAnswer: s('practice.yourAnswer'),
      resultsTitle: s('practice.resultsTitle'),
      resultsScore: (a: number, b: number) => fill(s('practice.resultsScore'), { a, b }),
      resultsAgain: s('practice.resultsAgain'),
      resultsReview: s('practice.resultsReview'),
      source: s('practice.source'),
      exitSet: s('practice.exitSet'),
      special: s('practice.special'),
      specialHint: s('practice.specialHint'),
      specialIntro: s('practice.specialIntro'),
      advanced: s('practice.advanced'),
      solveStepByStep: s('practice.solveStepByStep'),
      spotMistake: s('practice.spotMistake'),
      problemCount: (n: number) => plural('practice.problemCount', n),
    },

    progress: {
      title: s('progress.title'),
      subtitle: s('progress.subtitle'),
      overall: s('progress.overall'),
      bySubject: s('progress.bySubject'),
      byConcept: s('progress.byConcept'),
      conceptHint: s('progress.conceptHint'),
      practiceAccuracy: s('progress.practiceAccuracy'),
      questionsAnswered: s('progress.questionsAnswered'),
      lessonsDone: s('progress.lessonsDone'),
      timeSpent: s('progress.timeSpent'),
      strongest: s('progress.strongest'),
      weakest: s('progress.weakest'),
      reset: s('progress.reset'),
      resetConfirmTitle: s('progress.resetConfirmTitle'),
      resetConfirmBody: s('progress.resetConfirmBody'),
      localOnlyNote: s('progress.localOnlyNote'),
    },

    settings: {
      title: s('settings.title'),
      subtitle: s('settings.subtitle'),
      language: s('settings.language'),
      languageBody: s('settings.languageBody'),
      appearance: s('settings.appearance'),
      appearanceBody: s('settings.appearanceBody'),
      themeLight: s('settings.themeLight'),
      themeDark: s('settings.themeDark'),
      themeSystem: s('settings.themeSystem'),
      model: s('settings.model'),
      modelBody: s('settings.modelBody'),
      cloudModels: s('settings.cloudModels'),
      localModels: s('settings.localModels'),
      current: s('settings.current'),
      resident: s('settings.resident'),
      noSwap: s('settings.noSwap'),
      refresh: s('settings.refresh'),
      coldSwap: s('settings.coldSwap'),
      vision: s('settings.vision'),
      noVision: s('settings.noVision'),
      noVisionWarning: s('settings.noVisionWarning'),
      swapWarningTitle: s('settings.swapWarningTitle'),
      swapWarningBody: (model: string) => fill(s('settings.swapWarningBody'), { model }),
      swapConfirm: s('settings.swapConfirm'),
      swapping: s('settings.swapping'),
      swappingBody: s('settings.swappingBody'),
      swapFailed: s('settings.swapFailed'),
      swapSucceeded: (model: string) => fill(s('settings.swapSucceeded'), { model }),
      server: s('settings.server'),
      serverBody: s('settings.serverBody'),
      serverStatusOk: s('settings.serverStatusOk'),
      serverStatusDown: s('settings.serverStatusDown'),
      serverCheck: s('settings.serverCheck'),
      engines: (n: number) => plural('settings.engines', n),
      privacy: s('settings.privacy'),
      privacyBody: s('settings.privacyBody'),
    },
  };
}

export type Strings = ReturnType<typeof build>;

const CACHE = new Map<string, Strings>([['en', build(en)]]);
let activeCode = 'en';

function stringsFor(code: string): Strings {
  const key = code in DICTS ? code : 'en';
  let built = CACHE.get(key);
  if (!built) {
    built = build(DICTS[key]);
    CACHE.set(key, built);
  }
  return built;
}

/**
 * Point `t` at a locale. Called by SettingsProvider during render, before any
 * consumer reads `t`, so a language change and the strings it produces land in
 * the same commit.
 */
export function setLocale(code: string): void {
  activeCode = code in DICTS ? code : 'en';
}

/**
 * A live view of the active locale.
 *
 * It stays a module singleton rather than a hook because ~250 call sites read
 * it as plain data (`t.nav.dashboard`), including a few outside React. The
 * proxy resolves each read against whatever `setLocale` last selected; the
 * tree is remounted on language change (see `App.tsx`) so nothing keeps a
 * stale group object across locales.
 */
export const t: Strings = new Proxy({} as Strings, {
  get: (_target, prop) => stringsFor(activeCode)[prop as keyof Strings],
  has: (_target, prop) => prop in stringsFor(activeCode),
  ownKeys: () => Reflect.ownKeys(stringsFor(activeCode)),
  getOwnPropertyDescriptor: (_target, prop) =>
    Object.getOwnPropertyDescriptor(stringsFor(activeCode), prop),
});
