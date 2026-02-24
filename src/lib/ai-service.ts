import { supabase } from '@/integrations/supabase/client';
import type { QuizQuestion } from './data';

export const aiService = {
  async generateLessonPlan(params: {
    subject: string;
    topic: string;
    unit: string;
    classLevel: string;
    durationType: string;
    learningOutcomes?: string[];
  }): Promise<{ objectives: string; homework: string }> {
    const { data, error } = await supabase.functions.invoke('generate-lesson-plan', {
      body: params,
    });
    if (error) throw new Error(error.message || 'Failed to generate lesson plan');
    if (data?.error) throw new Error(data.error);
    return { objectives: data.objectives || '', homework: data.homework || '' };
  },

  async generateTeacherGuideline(params: {
    subject: string;
    topic: string;
    unit: string;
    classLevel: string;
    teachingGuidelines?: string[];
    assessmentIndicators?: string[];
  }): Promise<{ teachingScript: string; boardwork: string; referenceLinks: string; presentationContent: string }> {
    const { data, error } = await supabase.functions.invoke('generate-teacher-guideline', {
      body: params,
    });
    if (error) throw new Error(error.message || 'Failed to generate teacher guideline');
    if (data?.error) throw new Error(data.error);
    return {
      teachingScript: data.teachingScript || '',
      boardwork: data.boardwork || '',
      referenceLinks: data.referenceLinks || '',
      presentationContent: data.presentationContent || '',
    };
  },

  async generateQuiz(params: {
    topic: string;
    numQuestions: number;
    subject?: string;
    learningOutcomes?: string[];
  }): Promise<Omit<QuizQuestion, 'id' | 'quizId'>[]> {
    const { data, error } = await supabase.functions.invoke('generate-quiz', {
      body: params,
    });
    if (error) throw new Error(error.message || 'Failed to generate quiz');
    if (data?.error) throw new Error(data.error);
    return (data.questions || []).map((q: any) => ({
      qtype: q.qtype || 'mcq',
      difficulty: q.difficulty || 'medium',
      prompt: q.prompt || '',
      optionsJson: q.optionsJson || [],
      answerKey: q.answerKey || '',
      explanation: q.explanation || '',
    }));
  },

  async analyzeCDC(params: {
    uploadId: string;
    fileContent: string;
    gradeName?: string;
    subjectName?: string;
  }): Promise<{ success: boolean; grade?: string; subject?: string; units?: number; topics?: number; error?: string }> {
    const { data, error } = await supabase.functions.invoke('analyze-cdc', {
      body: params,
    });
    if (error) throw new Error(error.message || 'Failed to analyze CDC document');
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async generateWeeklyReport(params: {
    studentName: string;
    masteryScores: Record<string, number>;
  }): Promise<{ reportText: string; interventionsText: string }> {
    // Keep this as a simple template for now since it's simpler
    const weakTopics = Object.entries(params.masteryScores).filter(([, s]) => s < 60).map(([t]) => t);
    return {
      reportText: `Weekly Progress Report for ${params.studentName}:\n\nGood effort this week. ${weakTopics.length > 0 ? `Areas needing practice: ${weakTopics.join(', ')}.` : 'All topics progressing well!'}`,
      interventionsText: weakTopics.length > 0
        ? `1. Practice ${weakTopics[0]} for 15 minutes daily.\n2. Ask your child to explain what they learned.`
        : `1. Continue regular reading.\n2. Try challenge problems.`,
    };
  },

  async generateCoachResponse(params: {
    topic: string; question: string; showAnswer?: boolean; conversationHistory?: { role: string; content: string }[];
  }): Promise<{ explanation: string; hints: string[]; practiceQuestions: string[] }> {
    const { data, error } = await supabase.functions.invoke('generate-coach-response', {
      body: params,
    });
    if (error) throw new Error(error.message || 'Failed to get coach response');
    if (data?.error) throw new Error(data.error);
    return {
      explanation: data.explanation || '',
      hints: data.hints || [],
      practiceQuestions: data.practiceQuestions || [],
    };
  },
};
