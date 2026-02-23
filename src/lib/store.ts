import { supabase } from './supabaseClient';
import {
  LessonPlan, Quiz, QuizQuestion, QuizAttempt, WeeklyReport,
  Notification, AuditLog, MasteryState, StudentCheckin, ClassRoom, Subject, Topic,
  mapClassRoom, mapSubject, mapTopic, mapLessonPlan, mapQuiz, mapQuizQuestion,
  mapQuizAttempt, mapMastery, mapCheckin, mapReport, mapNotification, mapAuditLog, mapProfile,
} from './data';

// ---- localStorage helpers (offline cache) ----
const save = (key: string, data: any) => localStorage.setItem(`siksha_${key}`, JSON.stringify(data));
const load = <T>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(`siksha_${key}`) || '[]'); } catch { return []; }
};

// ---- Supabase Sync ----
export async function syncFromSupabase() {
  if (!navigator.onLine) return;
  try {
    const [subjects, topics, classes, classStudents, parentLinks, lessonPlans, quizzes, quizQuestions, attempts, mastery, checkins, reports, notifications, auditLogs, profiles] = await Promise.all([
      supabase.from('subjects').select('*'),
      supabase.from('topics').select('*'),
      supabase.from('classes').select('*'),
      supabase.from('class_students').select('*'),
      supabase.from('parent_links').select('*'),
      supabase.from('lesson_plans').select('*'),
      supabase.from('quizzes').select('*'),
      supabase.from('quiz_questions').select('*'),
      supabase.from('quiz_attempts').select('*'),
      supabase.from('mastery_states').select('*'),
      supabase.from('student_checkins').select('*'),
      supabase.from('weekly_reports').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('audit_logs').select('*'),
      supabase.from('profiles').select('*'),
    ]);

    if (subjects.data) save('subjects', subjects.data.map(mapSubject));
    if (topics.data) save('topics', topics.data.map(mapTopic));
    if (classes.data) save('classes', classes.data.map(mapClassRoom));
    if (classStudents.data) save('class_students', classStudents.data);
    if (parentLinks.data) save('parent_links', parentLinks.data);
    if (lessonPlans.data) save('lesson_plans', lessonPlans.data.map(mapLessonPlan));
    if (quizzes.data) save('quizzes', quizzes.data.map(mapQuiz));
    if (quizQuestions.data) save('quiz_questions', quizQuestions.data.map(mapQuizQuestion));
    if (attempts.data) save('quiz_attempts', attempts.data.map(mapQuizAttempt));
    if (mastery.data) save('mastery', mastery.data.map(mapMastery));
    if (checkins.data) save('checkins', checkins.data.map(mapCheckin));
    if (reports.data) save('weekly_reports', reports.data.map(mapReport));
    if (notifications.data) save('notifications', notifications.data.map(mapNotification));
    if (auditLogs.data) save('audit_logs', auditLogs.data.map(mapAuditLog));
    if (profiles.data) save('profiles', profiles.data.map(mapProfile));
  } catch (e) {
    console.warn('Supabase sync failed, using cached data', e);
  }
}

// ---- Synchronous DB interface (reads from localStorage cache) ----
export const db = {
  users: {
    getAll: () => load<{ id: string; name: string }>('profiles'),
    getById: (id: string) => load<{ id: string; name: string }>('profiles').find(u => u.id === id),
    getByRole: (_role: string) => load<{ id: string; name: string }>('profiles'), // filtered server-side by RLS
  },
  classes: {
    getAll: () => load<ClassRoom>('classes'),
    getById: (id: string) => load<ClassRoom>('classes').find(c => c.id === id),
    getByTeacher: (teacherId: string) => load<ClassRoom>('classes').filter(c => c.teacherId === teacherId),
    getStudents: (classId: string) => {
      const links = load<{ class_id: string; student_id: string }>('class_students').filter(cs => cs.class_id === classId);
      const profiles = load<{ id: string; name: string }>('profiles');
      return links.map(l => profiles.find(u => u.id === l.student_id)).filter(Boolean);
    },
    // Async CRUD for Supabase
    async create(c: { name: string; grade: number; teacherId: string }) {
      const { data } = await supabase.from('classes').insert({ name: c.name, grade: c.grade, teacher_id: c.teacherId }).select().single();
      if (data) { const all = load<ClassRoom>('classes'); all.push(mapClassRoom(data)); save('classes', all); }
      return data;
    },
    async addStudent(classId: string, studentId: string) {
      await supabase.from('class_students').insert({ class_id: classId, student_id: studentId });
      const all = load<any>('class_students'); all.push({ class_id: classId, student_id: studentId }); save('class_students', all);
    },
  },
  subjects: { getAll: () => load<Subject>('subjects') },
  topics: {
    getAll: () => load<Topic>('topics'),
    getBySubject: (subjectId: string) => load<Topic>('topics').filter(t => t.subjectId === subjectId),
  },
  lessonPlans: {
    getAll: () => load<LessonPlan>('lesson_plans'),
    getByClass: (classId: string) => load<LessonPlan>('lesson_plans').filter(lp => lp.classId === classId),
    create: (lp: LessonPlan) => {
      const all = load<LessonPlan>('lesson_plans'); all.push(lp); save('lesson_plans', all);
      // Async write to Supabase
      supabase.from('lesson_plans').insert({
        id: lp.id, class_id: lp.classId, topic_id: lp.topicId, level: lp.level,
        duration_minutes: lp.durationMinutes, objectives: lp.objectives, script: lp.script,
        boardwork: lp.boardwork, homework: lp.homework, created_by: lp.createdBy,
      }).then(() => {});
    },
  },
  quizzes: {
    getAll: () => load<Quiz>('quizzes'),
    getByClass: (classId: string) => load<Quiz>('quizzes').filter(q => q.classId === classId),
    create: (q: Quiz) => {
      const all = load<Quiz>('quizzes'); all.push(q); save('quizzes', all);
      supabase.from('quizzes').insert({
        id: q.id, class_id: q.classId, topic_id: q.topicId, title: q.title, created_by: q.createdBy,
      }).then(() => {});
    },
    getQuestions: (quizId: string) => load<QuizQuestion>('quiz_questions').filter(qq => qq.quizId === quizId),
    addQuestions: (questions: QuizQuestion[]) => {
      const all = load<QuizQuestion>('quiz_questions'); all.push(...questions); save('quiz_questions', all);
      supabase.from('quiz_questions').insert(questions.map(q => ({
        id: q.id, quiz_id: q.quizId, qtype: q.qtype, difficulty: q.difficulty,
        prompt: q.prompt, options_json: q.optionsJson, answer_key: q.answerKey, explanation: q.explanation,
      }))).then(() => {});
    },
  },
  attempts: {
    getByQuiz: (quizId: string) => load<QuizAttempt>('quiz_attempts').filter(a => a.quizId === quizId),
    getByStudent: (studentId: string) => load<QuizAttempt>('quiz_attempts').filter(a => a.studentId === studentId),
    create: (a: QuizAttempt) => {
      const all = load<QuizAttempt>('quiz_attempts'); all.push(a); save('quiz_attempts', all);
      supabase.from('quiz_attempts').insert({
        id: a.id, quiz_id: a.quizId, student_id: a.studentId, score: a.score, answers_json: a.answersJson,
      }).then(() => {});
    },
    bulkCreate: (attempts: QuizAttempt[]) => {
      const all = load<QuizAttempt>('quiz_attempts'); all.push(...attempts); save('quiz_attempts', all);
      supabase.from('quiz_attempts').insert(attempts.map(a => ({
        id: a.id, quiz_id: a.quizId, student_id: a.studentId, score: a.score, answers_json: a.answersJson,
      }))).then(() => {});
    },
  },
  mastery: {
    getByStudent: (studentId: string) => load<MasteryState>('mastery').filter(m => m.studentId === studentId),
    getByClass: (classId: string) => {
      const studentIds = load<{ class_id: string; student_id: string }>('class_students')
        .filter(cs => cs.class_id === classId).map(cs => cs.student_id);
      return load<MasteryState>('mastery').filter(m => studentIds.includes(m.studentId));
    },
    update: (studentId: string, topicId: string, score: number) => {
      const all = load<MasteryState>('mastery');
      const idx = all.findIndex(m => m.studentId === studentId && m.topicId === topicId);
      const now = new Date().toISOString();
      if (idx >= 0) { all[idx].masteryScore = score; all[idx].updatedAt = now; }
      else {
        const id = crypto.randomUUID();
        all.push({ id, studentId, topicId, masteryScore: score, updatedAt: now });
      }
      save('mastery', all);
      // Upsert to Supabase
      supabase.from('mastery_states').upsert({
        student_id: studentId, topic_id: topicId, mastery_score: score, updated_at: now,
      }, { onConflict: 'student_id,topic_id' }).then(() => {});
    },
  },
  checkins: {
    getByClass: (classId: string) => load<StudentCheckin>('checkins').filter(c => c.classId === classId),
    getByStudent: (studentId: string) => load<StudentCheckin>('checkins').filter(c => c.studentId === studentId),
    create: (c: StudentCheckin) => {
      const all = load<StudentCheckin>('checkins'); all.push(c); save('checkins', all);
      supabase.from('student_checkins').insert({
        id: c.id, student_id: c.studentId, class_id: c.classId, date: c.date,
        happiness_score: c.happinessScore, comment: c.comment,
      }).then(() => {});
    },
  },
  reports: {
    getAll: () => load<WeeklyReport>('weekly_reports'),
    getByStudent: (studentId: string) => load<WeeklyReport>('weekly_reports').filter(r => r.studentId === studentId),
    getByClass: (classId: string) => load<WeeklyReport>('weekly_reports').filter(r => r.classId === classId),
    create: (r: WeeklyReport) => {
      const all = load<WeeklyReport>('weekly_reports'); all.push(r); save('weekly_reports', all);
      supabase.from('weekly_reports').insert({
        id: r.id, class_id: r.classId, student_id: r.studentId, week_start: r.weekStart,
        report_text: r.reportText, interventions_text: r.interventionsText, status: r.status,
      }).then(() => {});
    },
    update: (id: string, updates: Partial<WeeklyReport>) => {
      const all = load<WeeklyReport>('weekly_reports');
      const idx = all.findIndex(r => r.id === id);
      if (idx >= 0) Object.assign(all[idx], updates);
      save('weekly_reports', all);
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.approvedBy) dbUpdates.approved_by = updates.approvedBy;
      if (updates.sentAt) dbUpdates.sent_at = updates.sentAt;
      supabase.from('weekly_reports').update(dbUpdates).eq('id', id).then(() => {});
    },
  },
  notifications: {
    getByUser: (userId: string) => load<Notification>('notifications').filter(n => n.userId === userId),
    create: (n: Notification) => {
      const all = load<Notification>('notifications'); all.push(n); save('notifications', all);
      supabase.from('notifications').insert({
        id: n.id, user_id: n.userId, type: n.type, message: n.message,
      }).then(() => {});
    },
    markRead: (id: string) => {
      const all = load<Notification>('notifications');
      const idx = all.findIndex(n => n.id === id);
      const now = new Date().toISOString();
      if (idx >= 0) all[idx].readAt = now;
      save('notifications', all);
      supabase.from('notifications').update({ read_at: now }).eq('id', id).then(() => {});
    },
  },
  audit: {
    log: (entry: AuditLog) => {
      const all = load<AuditLog>('audit_logs'); all.push(entry); save('audit_logs', all);
      supabase.from('audit_logs').insert({
        id: entry.id, actor_user_id: entry.actorUserId, action: entry.action,
        entity_type: entry.entityType, entity_id: entry.entityId, metadata_json: entry.metadataJson,
      }).then(() => {});
    },
    getAll: () => load<AuditLog>('audit_logs'),
  },
  parentLinks: {
    getChildren: (parentId: string) => {
      const links = load<{ parent_id: string; student_id: string }>('parent_links').filter(pl => pl.parent_id === parentId);
      const profiles = load<{ id: string; name: string }>('profiles');
      return links.map(l => profiles.find(u => u.id === l.student_id)).filter(Boolean);
    },
    async link(parentId: string, studentId: string) {
      await supabase.from('parent_links').insert({ parent_id: parentId, student_id: studentId });
      const all = load<any>('parent_links'); all.push({ parent_id: parentId, student_id: studentId }); save('parent_links', all);
    },
  },
};
