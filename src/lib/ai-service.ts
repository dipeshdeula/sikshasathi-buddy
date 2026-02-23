import type { LessonPlan, QuizQuestion, WeeklyReport, TeacherGuidelineEntry } from './data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const aiService = {
  async generateLessonPlan(params: {
    subject: string;
    topic: string;
    unit: string;
    classLevel: string;
    durationType: string;
    learningOutcomes?: string[];
  }): Promise<{ objectives: string; homework: string }> {
    await delay(1200);
    const outcomes = params.learningOutcomes?.join('\n• ') || 'Understand core concepts';
    return {
      objectives: `By the end of this ${params.durationType.toLowerCase()} lesson on "${params.topic}" (${params.unit}), students will:\n• ${outcomes}\n• Apply ${params.topic} concepts to solve real-world problems\n• Demonstrate understanding through formative assessment`,
      homework: `1. Review today's notes on ${params.topic}\n2. Complete 5 practice problems from textbook\n3. Write one real-life example of ${params.topic} application\n4. Prepare 2 questions for next class discussion`,
    };
  },

  async generateTeacherGuideline(params: {
    subject: string;
    topic: string;
    unit: string;
    classLevel: string;
    teachingGuidelines?: string[];
    assessmentIndicators?: string[];
  }): Promise<{ teachingScript: string; boardwork: string; referenceLinks: string; presentationContent: string }> {
    await delay(1500);
    const guidelines = params.teachingGuidelines?.join('\n') || '';
    return {
      teachingScript: `**Opening (5 min):** Greet students. Ask: "What do you know about ${params.topic}?" Record responses.\n\n**Main Activity (30 min):**\n- Introduce ${params.topic} using real-life Nepal context\n- Walk through 2-3 worked examples on the board\n${guidelines ? `- CDC Guidelines: ${guidelines}\n` : ''}- Pair activity: Students solve problems together\n- Class discussion on common mistakes\n\n**Closing (10 min):** Summarize key points. Quick oral quiz. Preview next topic.`,
      boardwork: `┌──────────────────────────────────────┐\n│ ${params.topic.toUpperCase()}                    │\n│ Unit: ${params.unit}                         │\n├──────────────────────────────────────┤\n│ Key Concepts:                        │\n│ 1. _______________                   │\n│ 2. _______________                   │\n│                                      │\n│ Example 1:         Example 2:        │\n│ [step-by-step]     [step-by-step]    │\n│                                      │\n│ Practice Problem:                    │\n│ ___________________________________  │\n└──────────────────────────────────────┘`,
      referenceLinks: `• Nepal CDC Curriculum Guide for ${params.subject}\n• Khan Academy: ${params.topic}\n• YouTube: ${params.topic} explained simply (search)\n• Textbook Chapter Reference: See ${params.unit}`,
      presentationContent: `# ${params.topic}\n## ${params.unit} — ${params.subject}\n\n### Slide 1: Introduction\n- What is ${params.topic}?\n- Why does it matter?\n\n### Slide 2: Key Concepts\n- Core definitions\n- Visual diagrams\n\n### Slide 3: Examples\n- Worked Example 1\n- Worked Example 2\n\n### Slide 4: Practice\n- Try these problems!\n\n### Slide 5: Summary\n- Key takeaways\n- Homework preview`,
    };
  },

  async generateQuiz(params: {
    topic: string;
    numQuestions: number;
    difficultyMix?: string;
  }): Promise<Omit<QuizQuestion, 'id' | 'quizId'>[]> {
    await delay(1500);
    const questions: Omit<QuizQuestion, 'id' | 'quizId'>[] = [];
    const diffs: Array<'easy' | 'medium' | 'hard'> = ['easy', 'easy', 'medium', 'medium', 'hard'];
    for (let i = 0; i < Math.min(params.numQuestions, 10); i++) {
      const diff = diffs[i % diffs.length];
      questions.push({
        qtype: 'mcq', difficulty: diff,
        prompt: `[${diff.toUpperCase()}] Question ${i + 1} about ${params.topic}: What is the correct answer?`,
        optionsJson: ['Option A (correct)', 'Option B', 'Option C', 'Option D'],
        answerKey: 'A',
        explanation: `The correct answer is A because it applies the concept of ${params.topic}.`,
      });
    }
    return questions;
  },

  async generateCoachResponse(params: {
    topic: string; question: string; showAnswer?: boolean;
  }): Promise<{ explanation: string; hints: string[]; practiceQuestions: string[] }> {
    await delay(1000);
    if (params.showAnswer) {
      return {
        explanation: `Here's the full answer about ${params.topic}:\n\nThe answer is found by applying the key concept step by step.`,
        hints: [], practiceQuestions: [],
      };
    }
    return {
      explanation: `Let's think about "${params.question}" together! 🤔\n\nImagine you're at a market in Kathmandu...`,
      hints: [
        `Hint 1: Start by identifying what you know about ${params.topic}.`,
        `Hint 2: Break the problem into smaller parts! 🥟`,
        `Hint 3: Now put the pieces together.`,
      ],
      practiceQuestions: [
        `Can you solve a simpler version?`,
        `What if the numbers were smaller?`,
        `Draw a picture of the problem.`,
      ],
    };
  },

  async generateWeeklyReport(params: {
    studentName: string; masteryScores: Record<string, number>;
  }): Promise<Pick<WeeklyReport, 'reportText' | 'interventionsText'>> {
    await delay(800);
    const weakTopics = Object.entries(params.masteryScores).filter(([, s]) => s < 60).map(([t]) => t);
    return {
      reportText: `Weekly Progress Report for ${params.studentName}:\n\nGood effort this week. ${weakTopics.length > 0 ? `Areas needing practice: ${weakTopics.join(', ')}.` : 'All topics progressing well!'}`,
      interventionsText: weakTopics.length > 0
        ? `1. Practice ${weakTopics[0]} for 15 minutes daily.\n2. Ask your child to explain what they learned.`
        : `1. Continue regular reading.\n2. Try challenge problems.`,
    };
  },
};
