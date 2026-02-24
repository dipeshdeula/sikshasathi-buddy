// Navo Ai Data Types (Supabase-backed, normalized curriculum)

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isVerified?: boolean;
}

export interface Grade {
  id: string;
  name: string;
  level: string;
  academicYear: string;
  isActive: boolean;
}

export interface Subject {
  id: string;
  gradeId: string;
  name: string;
  code: string;
  totalHoursPerYear: number | null;
  isCompulsory: boolean;
}

export interface Unit {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  orderIndex: number;
  estimatedHours: number | null;
}

export interface Topic {
  id: string;
  unitId: string;
  title: string;
  description: string;
  orderIndex: number;
  estimatedMinutes: number | null;
  difficultyLevel: string;
}

export interface LearningOutcome {
  id: string;
  topicId: string;
  outcomeText: string;
  competencyLevel: string | null;
  bloomLevel: string | null;
}

export interface TeachingGuideline {
  id: string;
  topicId: string;
  guidelineText: string;
  methodType: string | null;
}

export interface AssessmentIndicator {
  id: string;
  topicId: string;
  indicatorText: string;
  assessmentType: string | null;
}

export interface LessonPlan {
  id: string;
  teacherId: string;
  topicId: string;
  durationType: string;
  classLevel: string;
  objectives: string;
  homework: string;
  generatedByAi: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined data for display
  topicTitle?: string;
  unitTitle?: string;
  subjectName?: string;
}

export interface TeacherGuidelineEntry {
  id: string;
  teacherId: string;
  topicId: string;
  teachingScript: string;
  boardwork: string;
  referenceLinks: string;
  presentationContent: string;
  generatedByAi: boolean;
  createdAt: string;
  updatedAt: string;
  topicTitle?: string;
  unitTitle?: string;
  subjectName?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  gradeId: string;
  teacherId: string;
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

// Mappers
export const mapGrade = (r: any): Grade => ({
  id: r.id, name: r.name, level: r.level, academicYear: r.academic_year || '', isActive: r.is_active ?? true,
});
export const mapSubject = (r: any): Subject => ({
  id: r.id, gradeId: r.grade_id || '', name: r.name, code: r.code || '',
  totalHoursPerYear: r.total_hours_per_year, isCompulsory: r.is_compulsory ?? true,
});
export const mapUnit = (r: any): Unit => ({
  id: r.id, subjectId: r.subject_id || '', title: r.title, description: r.description || '',
  orderIndex: r.order_index || 0, estimatedHours: r.estimated_hours,
});
export const mapTopic = (r: any): Topic => ({
  id: r.id, unitId: r.unit_id || '', title: r.title, description: r.description || '',
  orderIndex: r.order_index || 0, estimatedMinutes: r.estimated_minutes,
  difficultyLevel: r.difficulty_level || 'Medium',
});
export const mapLearningOutcome = (r: any): LearningOutcome => ({
  id: r.id, topicId: r.topic_id || '', outcomeText: r.outcome_text,
  competencyLevel: r.competency_level, bloomLevel: r.bloom_level,
});
export const mapTeachingGuideline = (r: any): TeachingGuideline => ({
  id: r.id, topicId: r.topic_id || '', guidelineText: r.guideline_text, methodType: r.method_type,
});
export const mapAssessmentIndicator = (r: any): AssessmentIndicator => ({
  id: r.id, topicId: r.topic_id || '', indicatorText: r.indicator_text, assessmentType: r.assessment_type,
});
export const mapLessonPlan = (r: any): LessonPlan => ({
  id: r.id, teacherId: r.teacher_id || '', topicId: r.topic_id || '',
  durationType: r.duration_type || 'Daily', classLevel: r.class_level || 'Medium',
  objectives: r.objectives || '', homework: r.homework || '',
  generatedByAi: r.generated_by_ai ?? false,
  createdAt: r.created_at || '', updatedAt: r.updated_at || '',
});
export const mapTeacherGuidelineEntry = (r: any): TeacherGuidelineEntry => ({
  id: r.id, teacherId: r.teacher_id || '', topicId: r.topic_id || '',
  teachingScript: r.teaching_script || '', boardwork: r.boardwork || '',
  referenceLinks: r.reference_links || '', presentationContent: r.presentation_content || '',
  generatedByAi: r.generated_by_ai ?? false,
  createdAt: r.created_at || '', updatedAt: r.updated_at || '',
});
export const mapClassRoom = (r: any): ClassRoom => ({
  id: r.id, name: r.name, gradeId: r.grade_id || '', teacherId: r.teacher_id || '',
});
export const mapQuiz = (r: any): Quiz => ({
  id: r.id, classId: r.class_id || '', topicId: r.topic_id || '', title: r.title,
  createdBy: r.created_by || '', createdAt: r.created_at || '',
});
export const mapQuizQuestion = (r: any): QuizQuestion => ({
  id: r.id, quizId: r.quiz_id || '', qtype: r.qtype, difficulty: r.difficulty,
  prompt: r.prompt, optionsJson: r.options_json || [], answerKey: r.answer_key || '',
  explanation: r.explanation || '',
});
export const mapQuizAttempt = (r: any): QuizAttempt => ({
  id: r.id, quizId: r.quiz_id || '', studentId: r.student_id || '',
  submittedAt: r.submitted_at || '', score: r.score || 0, answersJson: r.answers_json || {},
});
export const mapMastery = (r: any): MasteryState => ({
  id: r.id, studentId: r.student_id || '', topicId: r.topic_id || '',
  masteryScore: r.mastery_score || 0, updatedAt: r.updated_at || '',
});
export const mapCheckin = (r: any): StudentCheckin => ({
  id: r.id, studentId: r.student_id || '', classId: r.class_id || '',
  date: r.date, happinessScore: r.happiness_score, comment: r.comment || '',
});
export const mapReport = (r: any): WeeklyReport => ({
  id: r.id, classId: r.class_id || '', studentId: r.student_id || '',
  weekStart: r.week_start, reportText: r.report_text || '',
  interventionsText: r.interventions_text || '', status: r.status,
  approvedBy: r.approved_by, sentAt: r.sent_at,
});
export const mapNotification = (r: any): Notification => ({
  id: r.id, userId: r.user_id || '', type: r.type || '',
  message: r.message || '', createdAt: r.created_at || '', readAt: r.read_at,
});
export const mapAuditLog = (r: any): AuditLog => ({
  id: r.id, actorUserId: r.actor_user_id || '', action: r.action,
  entityType: r.entity_type || '', entityId: r.entity_id || '',
  createdAt: r.created_at || '', metadataJson: r.metadata_json,
});
export const mapProfile = (r: any): { id: string; name: string } => ({
  id: r.id, name: r.full_name || '',
});
