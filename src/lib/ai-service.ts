import { LessonPlan, QuizQuestion, WeeklyReport } from './data';

// Simulated delay for AI responses
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const aiService = {
  async generateLessonPlan(params: {
    grade: number;
    subject: string;
    topic: string;
    level: string;
    duration: number;
  }): Promise<Partial<LessonPlan>> {
    await delay(1200);
    return {
      objectives: `Students will be able to understand and apply ${params.topic} concepts at ${params.level} level.\n1. Define key terms related to ${params.topic}\n2. Solve basic problems involving ${params.topic}\n3. Apply concepts to real-world scenarios`,
      script: `**Opening (5 min):** Begin by asking students what they know about ${params.topic}. Write responses on the board.\n\n**Main Activity (${params.duration - 15} min):**\n- Introduce the concept of ${params.topic} with a simple real-life example from Nepal.\n- Walk through 2-3 worked examples on the board.\n- Have students try one problem independently.\n- Discuss common mistakes.\n\n**Closing (10 min):** Review key points. Assign exit ticket.`,
      boardwork: `Title: ${params.topic} (Grade ${params.grade})\n\n┌─────────────────────────────────┐\n│ Key Terms:                      │\n│ • Definition 1                  │\n│ • Definition 2                  │\n│                                 │\n│ Example 1:        Example 2:    │\n│ [worked out]      [worked out]  │\n│                                 │\n│ Practice: Try this one!         │\n│ ________________________________│\n└─────────────────────────────────┘`,
      homework: `1. Review today's notes on ${params.topic}\n2. Complete 5 practice problems from textbook page XX\n3. Write one real-life example of ${params.topic}`,
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
        qtype: 'mcq',
        difficulty: diff,
        prompt: `[${diff.toUpperCase()}] Question ${i + 1} about ${params.topic}: What is the correct answer for this ${diff} level concept?`,
        optionsJson: ['Option A (correct)', 'Option B', 'Option C', 'Option D'],
        answerKey: 'A',
        explanation: `The correct answer is A because it directly applies the concept of ${params.topic} at a ${diff} level.`,
      });
    }
    return questions;
  },

  async generateCoachResponse(params: {
    topic: string;
    question: string;
    showAnswer?: boolean;
  }): Promise<{ explanation: string; hints: string[]; practiceQuestions: string[] }> {
    await delay(1000);
    
    if (params.showAnswer) {
      return {
        explanation: `Great question about ${params.topic}! Here's the full answer:\n\nThe answer is found by applying the key concept step by step. Think of it like this: imagine you have a pizza (that's like our problem). You need to divide it into equal parts. Each part represents one piece of the solution!\n\nThe final answer is: **The result after applying all steps correctly.**`,
        hints: [],
        practiceQuestions: [],
      };
    }

    return {
      explanation: `Let's think about "${params.question}" together! 🤔\n\nImagine you're at a market in Kathmandu. You have some items and need to figure this out step by step. Don't worry, I'll help you!`,
      hints: [
        `Hint 1: Start by identifying what you already know about ${params.topic}.`,
        `Hint 2: Try breaking the problem into smaller parts — like cutting a momo into pieces! 🥟`,
        `Hint 3: Now put the pieces together. What pattern do you see?`,
      ],
      practiceQuestions: [
        `Can you solve a simpler version of this problem?`,
        `What if the numbers were smaller — try with 2 and 3 first!`,
        `Draw a picture of the problem. What does it look like?`,
      ],
    };
  },

  async generateWeeklyReport(params: {
    studentName: string;
    masteryScores: Record<string, number>;
  }): Promise<Pick<WeeklyReport, 'reportText' | 'interventionsText'>> {
    await delay(800);
    const weakTopics = Object.entries(params.masteryScores)
      .filter(([, score]) => score < 60)
      .map(([topic]) => topic);

    return {
      reportText: `Weekly Progress Report for ${params.studentName}:\n\nYour child showed good effort this week. ${
        weakTopics.length > 0
          ? `Areas that need more practice: ${weakTopics.join(', ')}.`
          : 'All topics are progressing well!'
      } Overall participation has been positive.`,
      interventionsText: weakTopics.length > 0
        ? `Home Interventions:\n1. Practice ${weakTopics[0]} for 15 minutes daily using the textbook exercises.\n2. Ask your child to explain what they learned about ${weakTopics[0]} — teaching helps learning!`
        : `Home Interventions:\n1. Continue regular reading for 15 minutes daily.\n2. Encourage your child to try challenge problems for extra growth.`,
    };
  },
};
