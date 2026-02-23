// SikshaSathi Data Types (Supabase-backed)

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface AppUser {
  id: string;
  name: string;       // mapped from profiles.full_name
  email: string;
  role: Role;
}

export interface ClassRoom {
  id: string;
  name: string;
  grade: number;
  teacherId: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  grade: number;
  name: string;
  cdcTag: string;
}

export interface LessonPlan {
  id: string;
  classId: string;
  topicId: string;
  level: 'Low' | 'Medium' | 'High';
  durationMinutes: number;
  objectives: string;
  script: string;
  boardwork: string;
  homework: string;
  createdBy: string;
  createdAt: string;
}

export interface Quiz {
  id: string;
  classId: string;
  topicId: string;
  title: string;
  createdBy: string;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  qtype: 'mcq' | 'short' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  optionsJson: string[];
  answerKey: string;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  submittedAt: string;
  score: number;
  answersJson: Record<string, string>;
}

export interface MasteryState {
  id: string;
  studentId: string;
  topicId: string;
  masteryScore: number;
  updatedAt: string;
}

export interface StudentCheckin {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  happinessScore: number;
  comment: string;
}

export interface WeeklyReport {
  id: string;
  classId: string;
  studentId: string;
  weekStart: string;
  reportText: string;
  interventionsText: string;
  status: 'draft' | 'approved' | 'sent';
  approvedBy?: string;
  sentAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadataJson?: Record<string, any>;
}

// Mappers: Supabase snake_case → App camelCase
export const mapClassRoom = (row: any): ClassRoom => ({
  id: row.id, name: row.name, grade: row.grade, teacherId: row.teacher_id,
});

export const mapSubject = (row: any): Subject => ({ id: row.id, name: row.name });

export const mapTopic = (row: any): Topic => ({
  id: row.id, subjectId: row.subject_id, grade: row.grade, name: row.name, cdcTag: row.cdc_tag || '',
});

export const mapLessonPlan = (row: any): LessonPlan => ({
  id: row.id, classId: row.class_id, topicId: row.topic_id, level: row.level,
  durationMinutes: row.duration_minutes, objectives: row.objectives || '',
  script: row.script || '', boardwork: row.boardwork || '', homework: row.homework || '',
  createdBy: row.created_by, createdAt: row.created_at,
});

export const mapQuiz = (row: any): Quiz => ({
  id: row.id, classId: row.class_id, topicId: row.topic_id, title: row.title,
  createdBy: row.created_by, createdAt: row.created_at,
});

export const mapQuizQuestion = (row: any): QuizQuestion => ({
  id: row.id, quizId: row.quiz_id, qtype: row.qtype, difficulty: row.difficulty,
  prompt: row.prompt, optionsJson: row.options_json || [], answerKey: row.answer_key || '',
  explanation: row.explanation || '',
});

export const mapQuizAttempt = (row: any): QuizAttempt => ({
  id: row.id, quizId: row.quiz_id, studentId: row.student_id,
  submittedAt: row.submitted_at, score: row.score, answersJson: row.answers_json || {},
});

export const mapMastery = (row: any): MasteryState => ({
  id: row.id, studentId: row.student_id, topicId: row.topic_id,
  masteryScore: row.mastery_score, updatedAt: row.updated_at,
});

export const mapCheckin = (row: any): StudentCheckin => ({
  id: row.id, studentId: row.student_id, classId: row.class_id,
  date: row.date, happinessScore: row.happiness_score, comment: row.comment || '',
});

export const mapReport = (row: any): WeeklyReport => ({
  id: row.id, classId: row.class_id, studentId: row.student_id,
  weekStart: row.week_start, reportText: row.report_text || '',
  interventionsText: row.interventions_text || '', status: row.status,
  approvedBy: row.approved_by, sentAt: row.sent_at,
});

export const mapNotification = (row: any): Notification => ({
  id: row.id, userId: row.user_id, type: row.type || '',
  message: row.message || '', createdAt: row.created_at, readAt: row.read_at,
});

export const mapAuditLog = (row: any): AuditLog => ({
  id: row.id, actorUserId: row.actor_user_id, action: row.action,
  entityType: row.entity_type || '', entityId: row.entity_id || '',
  createdAt: row.created_at, metadataJson: row.metadata_json,
});

export const mapProfile = (row: any): { id: string; name: string; email?: string } => ({
  id: row.id, name: row.full_name || '',
});
