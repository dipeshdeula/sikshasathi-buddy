// SikshaSathi Data Types & Seed Data

// ===== TYPES =====
export type Role = 'admin' | 'teacher' | 'student' | 'parent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password: string;
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
  lessonPlanId?: string;
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

// ===== SEED DATA =====
const uid = (n: number) => `user-${n.toString().padStart(3, '0')}`;
const sid = (n: number) => `student-${n.toString().padStart(3, '0')}`;

export const SEED_USERS: User[] = [
  { id: 'admin-001', name: 'Admin Shrestha', email: 'admin@siksha.np', role: 'admin', password: 'admin123' },
  { id: 'teacher-001', name: 'Sita Gurung', email: 'sita@siksha.np', role: 'teacher', password: 'teacher123' },
  ...Array.from({ length: 20 }, (_, i) => ({
    id: sid(i + 1),
    name: [
      'Aarav Tamang', 'Bina Rai', 'Chandan Thapa', 'Deepa Magar', 'Ekta Sharma',
      'Firoj Ansari', 'Gita Basnet', 'Hari Adhikari', 'Isha Poudel', 'Jeevan KC',
      'Kabita Limbu', 'Laxman Bhandari', 'Mina Ghimire', 'Nabin Karki', 'Om Dahal',
      'Puja Rijal', 'Quasar Shahi', 'Ramesh Khatri', 'Sunita Pandey', 'Tilak Bhatt',
    ][i],
    email: `student${i + 1}@siksha.np`,
    role: 'student' as Role,
    password: 'student123',
  })),
  { id: 'parent-001', name: 'Kamal Tamang', email: 'parent@siksha.np', role: 'parent', password: 'parent123' },
];

export const SEED_CLASSES: ClassRoom[] = [
  { id: 'class-001', name: 'Grade 7 - Section A', grade: 7, teacherId: 'teacher-001' },
];

export const SEED_CLASS_STUDENTS = Array.from({ length: 20 }, (_, i) => ({
  classId: 'class-001',
  studentId: sid(i + 1),
}));

export const SEED_PARENT_LINKS = [
  { parentId: 'parent-001', studentId: 'student-001' },
];

export const SEED_SUBJECTS: Subject[] = [
  { id: 'subj-math', name: 'Math' },
  { id: 'subj-science', name: 'Science' },
  { id: 'subj-nepali', name: 'Nepali' },
];

export const SEED_TOPICS: Topic[] = [
  { id: 'topic-fractions', subjectId: 'subj-math', grade: 7, name: 'Fractions', cdcTag: 'CDC-MATH-7-01' },
  { id: 'topic-decimals', subjectId: 'subj-math', grade: 7, name: 'Decimals', cdcTag: 'CDC-MATH-7-02' },
  { id: 'topic-algebra', subjectId: 'subj-math', grade: 7, name: 'Basic Algebra', cdcTag: 'CDC-MATH-7-03' },
  { id: 'topic-exothermic', subjectId: 'subj-science', grade: 7, name: 'Exothermic Reactions', cdcTag: 'CDC-SCI-7-01' },
  { id: 'topic-photosyn', subjectId: 'subj-science', grade: 7, name: 'Photosynthesis', cdcTag: 'CDC-SCI-7-02' },
  { id: 'topic-cells', subjectId: 'subj-science', grade: 7, name: 'Plant & Animal Cells', cdcTag: 'CDC-SCI-7-03' },
  { id: 'topic-nepchap1', subjectId: 'subj-nepali', grade: 7, name: 'हाम्रो नेपाल (Our Nepal)', cdcTag: 'CDC-NEP-7-01' },
  { id: 'topic-nepchap2', subjectId: 'subj-nepali', grade: 7, name: 'कथा लेखन (Story Writing)', cdcTag: 'CDC-NEP-7-02' },
];

// Generate sample mastery data
export const SEED_MASTERY: MasteryState[] = SEED_TOPICS.flatMap(topic =>
  Array.from({ length: 20 }, (_, i) => ({
    id: `mastery-${topic.id}-${sid(i + 1)}`,
    studentId: sid(i + 1),
    topicId: topic.id,
    masteryScore: Math.round(30 + Math.random() * 70),
    updatedAt: new Date().toISOString(),
  }))
);

export const SEED_CHECKINS: StudentCheckin[] = Array.from({ length: 20 }, (_, i) => ({
  id: `checkin-${i}`,
  studentId: sid(i + 1),
  classId: 'class-001',
  date: new Date().toISOString().split('T')[0],
  happinessScore: Math.ceil(Math.random() * 5),
  comment: ['Great class!', 'I need help', 'Fun today', 'A bit tired', ''][Math.floor(Math.random() * 5)],
}));
