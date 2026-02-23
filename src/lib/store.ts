import { SEED_USERS, SEED_CLASSES, SEED_CLASS_STUDENTS, SEED_PARENT_LINKS, SEED_SUBJECTS, SEED_TOPICS, SEED_MASTERY, SEED_CHECKINS, LessonPlan, Quiz, QuizQuestion, QuizAttempt, WeeklyReport, Notification, AuditLog, MasteryState, StudentCheckin } from './data';

// Initialize localStorage with seed data if not present
const init = <T>(key: string, seed: T): T => {
  const stored = localStorage.getItem(`siksha_${key}`);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(`siksha_${key}`, JSON.stringify(seed));
  return seed;
};

const save = (key: string, data: any) => localStorage.setItem(`siksha_${key}`, JSON.stringify(data));
const load = <T>(key: string): T[] => JSON.parse(localStorage.getItem(`siksha_${key}`) || '[]');

// Initialize on first import
init('users', SEED_USERS);
init('classes', SEED_CLASSES);
init('class_students', SEED_CLASS_STUDENTS);
init('parent_links', SEED_PARENT_LINKS);
init('subjects', SEED_SUBJECTS);
init('topics', SEED_TOPICS);
init('mastery', SEED_MASTERY);
init('checkins', SEED_CHECKINS);
init('lesson_plans', []);
init('quizzes', []);
init('quiz_questions', []);
init('quiz_attempts', []);
init('weekly_reports', []);
init('notifications', []);
init('audit_logs', []);

export const db = {
  users: {
    getAll: () => load<typeof SEED_USERS[0]>('users'),
    getById: (id: string) => load<typeof SEED_USERS[0]>('users').find(u => u.id === id),
    getByRole: (role: string) => load<typeof SEED_USERS[0]>('users').filter(u => u.role === role),
  },
  classes: {
    getAll: () => load<typeof SEED_CLASSES[0]>('classes'),
    getById: (id: string) => load<typeof SEED_CLASSES[0]>('classes').find(c => c.id === id),
    getByTeacher: (teacherId: string) => load<typeof SEED_CLASSES[0]>('classes').filter(c => c.teacherId === teacherId),
    getStudents: (classId: string) => {
      const links = load<typeof SEED_CLASS_STUDENTS[0]>('class_students').filter(cs => cs.classId === classId);
      const users = load<typeof SEED_USERS[0]>('users');
      return links.map(l => users.find(u => u.id === l.studentId)).filter(Boolean);
    },
  },
  subjects: { getAll: () => load<typeof SEED_SUBJECTS[0]>('subjects') },
  topics: {
    getAll: () => load<typeof SEED_TOPICS[0]>('topics'),
    getBySubject: (subjectId: string) => load<typeof SEED_TOPICS[0]>('topics').filter(t => t.subjectId === subjectId),
  },
  lessonPlans: {
    getAll: () => load<LessonPlan>('lesson_plans'),
    getByClass: (classId: string) => load<LessonPlan>('lesson_plans').filter(lp => lp.classId === classId),
    create: (lp: LessonPlan) => { const all = load<LessonPlan>('lesson_plans'); all.push(lp); save('lesson_plans', all); },
  },
  quizzes: {
    getAll: () => load<Quiz>('quizzes'),
    getByClass: (classId: string) => load<Quiz>('quizzes').filter(q => q.classId === classId),
    create: (q: Quiz) => { const all = load<Quiz>('quizzes'); all.push(q); save('quizzes', all); },
    getQuestions: (quizId: string) => load<QuizQuestion>('quiz_questions').filter(qq => qq.quizId === quizId),
    addQuestions: (questions: QuizQuestion[]) => { const all = load<QuizQuestion>('quiz_questions'); all.push(...questions); save('quiz_questions', all); },
  },
  attempts: {
    getByQuiz: (quizId: string) => load<QuizAttempt>('quiz_attempts').filter(a => a.quizId === quizId),
    getByStudent: (studentId: string) => load<QuizAttempt>('quiz_attempts').filter(a => a.studentId === studentId),
    create: (a: QuizAttempt) => { const all = load<QuizAttempt>('quiz_attempts'); all.push(a); save('quiz_attempts', all); },
    bulkCreate: (attempts: QuizAttempt[]) => { const all = load<QuizAttempt>('quiz_attempts'); all.push(...attempts); save('quiz_attempts', all); },
  },
  mastery: {
    getByStudent: (studentId: string) => load<MasteryState>('mastery').filter(m => m.studentId === studentId),
    getByClass: (classId: string) => {
      const studentIds = load<typeof SEED_CLASS_STUDENTS[0]>('class_students').filter(cs => cs.classId === classId).map(cs => cs.studentId);
      return load<MasteryState>('mastery').filter(m => studentIds.includes(m.studentId));
    },
    update: (studentId: string, topicId: string, score: number) => {
      const all = load<MasteryState>('mastery');
      const idx = all.findIndex(m => m.studentId === studentId && m.topicId === topicId);
      if (idx >= 0) { all[idx].masteryScore = score; all[idx].updatedAt = new Date().toISOString(); }
      else all.push({ id: `mastery-${Date.now()}`, studentId, topicId, masteryScore: score, updatedAt: new Date().toISOString() });
      save('mastery', all);
    },
  },
  checkins: {
    getByClass: (classId: string) => load<StudentCheckin>('checkins').filter(c => c.classId === classId),
    getByStudent: (studentId: string) => load<StudentCheckin>('checkins').filter(c => c.studentId === studentId),
    create: (c: StudentCheckin) => { const all = load<StudentCheckin>('checkins'); all.push(c); save('checkins', all); },
  },
  reports: {
    getAll: () => load<WeeklyReport>('weekly_reports'),
    getByStudent: (studentId: string) => load<WeeklyReport>('weekly_reports').filter(r => r.studentId === studentId),
    getByClass: (classId: string) => load<WeeklyReport>('weekly_reports').filter(r => r.classId === classId),
    create: (r: WeeklyReport) => { const all = load<WeeklyReport>('weekly_reports'); all.push(r); save('weekly_reports', all); },
    update: (id: string, updates: Partial<WeeklyReport>) => {
      const all = load<WeeklyReport>('weekly_reports');
      const idx = all.findIndex(r => r.id === id);
      if (idx >= 0) Object.assign(all[idx], updates);
      save('weekly_reports', all);
    },
  },
  notifications: {
    getByUser: (userId: string) => load<Notification>('notifications').filter(n => n.userId === userId),
    create: (n: Notification) => { const all = load<Notification>('notifications'); all.push(n); save('notifications', all); },
    markRead: (id: string) => {
      const all = load<Notification>('notifications');
      const idx = all.findIndex(n => n.id === id);
      if (idx >= 0) all[idx].readAt = new Date().toISOString();
      save('notifications', all);
    },
  },
  audit: {
    log: (entry: AuditLog) => { const all = load<AuditLog>('audit_logs'); all.push(entry); save('audit_logs', all); },
    getAll: () => load<AuditLog>('audit_logs'),
  },
  parentLinks: {
    getChildren: (parentId: string) => {
      const links = load<typeof SEED_PARENT_LINKS[0]>('parent_links').filter(pl => pl.parentId === parentId);
      const users = load<typeof SEED_USERS[0]>('users');
      return links.map(l => users.find(u => u.id === l.studentId)).filter(Boolean);
    },
  },
};
