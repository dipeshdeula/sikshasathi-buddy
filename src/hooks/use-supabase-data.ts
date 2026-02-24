import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ClassRoom, Subject, Topic, Grade, Unit, MasteryState, StudentCheckin,
  Quiz, QuizQuestion, QuizAttempt, WeeklyReport, Notification, LessonPlan,
  mapClassRoom, mapSubject, mapTopic, mapGrade, mapUnit, mapMastery,
  mapCheckin, mapQuiz, mapQuizQuestion, mapQuizAttempt, mapReport, mapNotification, mapLessonPlan,
} from '@/lib/data';

// Generic fetch hook
function useSupabaseQuery<T>(
  queryFn: () => Promise<T[]>,
  deps: any[] = []
): { data: T[]; loading: boolean; refetch: () => void } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  
  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await queryFn();
      setData(result);
    } catch (e) {
      console.warn('Query failed:', e);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { refetch(); }, [refetch]);
  
  return { data, loading, refetch };
}

// Teacher classes
export function useTeacherClasses(teacherId?: string) {
  return useSupabaseQuery<ClassRoom>(async () => {
    if (!teacherId) return [];
    const { data } = await supabase.from('classes').select('*').eq('teacher_id', teacherId);
    return (data || []).map(mapClassRoom);
  }, [teacherId]);
}

// Class students
export function useClassStudents(classId?: string) {
  return useSupabaseQuery<{ id: string; name: string; isVerified: boolean; classLevel: string | null; section: string | null }>(async () => {
    if (!classId) return [];
    const { data } = await supabase
      .from('class_students')
      .select('student_id, profiles!class_students_student_id_fkey(id, full_name, is_verified, preferred_class_level, preferred_section)')
      .eq('class_id', classId);
    return (data || []).map((d: any) => ({
      id: d.profiles.id,
      name: d.profiles.full_name,
      isVerified: d.profiles.is_verified ?? false,
      classLevel: d.profiles.preferred_class_level,
      section: d.profiles.preferred_section,
    }));
  }, [classId]);
}

// Lesson plans by teacher
export function useTeacherLessonPlans(teacherId?: string) {
  return useSupabaseQuery<LessonPlan & { topicTitle?: string; unitTitle?: string; subjectName?: string }>(async () => {
    if (!teacherId) return [];
    const { data } = await supabase
      .from('lesson_plans')
      .select('*, topics(title, unit_id, units(title, subject_id, subjects(name)))')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    return (data || []).map((r: any) => ({
      ...mapLessonPlan(r),
      topicTitle: r.topics?.title || '',
      unitTitle: r.topics?.units?.title || '',
      subjectName: r.topics?.units?.subjects?.name || '',
    }));
  }, [teacherId]);
}

// Quizzes by class
export function useClassQuizzes(classId?: string) {
  return useSupabaseQuery<Quiz>(async () => {
    if (!classId) return [];
    const { data } = await supabase.from('quizzes').select('*').eq('class_id', classId);
    return (data || []).map(mapQuiz);
  }, [classId]);
}

// Quiz questions
export function useQuizQuestions(quizId?: string) {
  return useSupabaseQuery<QuizQuestion>(async () => {
    if (!quizId) return [];
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId);
    return (data || []).map(mapQuizQuestion);
  }, [quizId]);
}

// Mastery by class
export function useClassMastery(classId?: string) {
  return useSupabaseQuery<MasteryState>(async () => {
    if (!classId) return [];
    const { data: studentLinks } = await supabase.from('class_students').select('student_id').eq('class_id', classId);
    if (!studentLinks?.length) return [];
    const studentIds = studentLinks.map(s => s.student_id);
    const { data } = await supabase.from('mastery_states').select('*').in('student_id', studentIds);
    return (data || []).map(mapMastery);
  }, [classId]);
}

// Mastery by student
export function useStudentMastery(studentId?: string) {
  return useSupabaseQuery<MasteryState>(async () => {
    if (!studentId) return [];
    const { data } = await supabase.from('mastery_states').select('*').eq('student_id', studentId);
    return (data || []).map(mapMastery);
  }, [studentId]);
}

// Checkins by class
export function useClassCheckins(classId?: string) {
  return useSupabaseQuery<StudentCheckin>(async () => {
    if (!classId) return [];
    const { data } = await supabase.from('student_checkins').select('*').eq('class_id', classId);
    return (data || []).map(mapCheckin);
  }, [classId]);
}

// Checkins by student
export function useStudentCheckins(studentId?: string) {
  return useSupabaseQuery<StudentCheckin>(async () => {
    if (!studentId) return [];
    const { data } = await supabase.from('student_checkins').select('*').eq('student_id', studentId);
    return (data || []).map(mapCheckin);
  }, [studentId]);
}

// All topics
export function useTopics() {
  return useSupabaseQuery<Topic>(async () => {
    const { data } = await supabase.from('topics').select('*').order('order_index');
    return (data || []).map(mapTopic);
  }, []);
}

// All subjects
export function useSubjects() {
  return useSupabaseQuery<Subject>(async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    return (data || []).map(mapSubject);
  }, []);
}

// Reports by class
export function useClassReports(classId?: string) {
  return useSupabaseQuery<WeeklyReport>(async () => {
    if (!classId) return [];
    const { data } = await supabase.from('weekly_reports').select('*').eq('class_id', classId).order('week_start', { ascending: false });
    return (data || []).map(mapReport);
  }, [classId]);
}

// Reports by student
export function useStudentReports(studentId?: string) {
  return useSupabaseQuery<WeeklyReport>(async () => {
    if (!studentId) return [];
    const { data } = await supabase.from('weekly_reports').select('*').eq('student_id', studentId);
    return (data || []).map(mapReport);
  }, [studentId]);
}

// Notifications by user
export function useUserNotifications(userId?: string) {
  return useSupabaseQuery<Notification>(async () => {
    if (!userId) return [];
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data || []).map(mapNotification);
  }, [userId]);
}

// Parent children
export function useParentChildren(parentId?: string) {
  return useSupabaseQuery<{ id: string; name: string }>(async () => {
    if (!parentId) return [];
    const { data } = await supabase
      .from('parent_links')
      .select('student_id, profiles!parent_links_student_id_fkey(id, full_name)')
      .eq('parent_id', parentId);
    return (data || []).map((d: any) => ({ id: d.profiles.id, name: d.profiles.full_name }));
  }, [parentId]);
}

// Lesson completions
export function useLessonCompletions(lessonPlanIds?: string[]) {
  return useSupabaseQuery<{ id: string; lessonPlanId: string; isCompleted: boolean; completedAt: string | null }>(async () => {
    if (!lessonPlanIds?.length) return [];
    const { data } = await supabase.from('lesson_completions').select('*').in('lesson_plan_id', lessonPlanIds);
    return (data || []).map((r: any) => ({
      id: r.id, lessonPlanId: r.lesson_plan_id, isCompleted: r.is_completed, completedAt: r.completed_at,
    }));
  }, [lessonPlanIds?.join(',')]);
}

// Student lesson verifications
export function useStudentLessonVerifications(lessonPlanIds?: string[], studentId?: string) {
  return useSupabaseQuery<{ id: string; lessonPlanId: string; studentId: string; isVerified: boolean }>(async () => {
    if (!lessonPlanIds?.length) return [];
    let query = supabase.from('student_lesson_verifications').select('*').in('lesson_plan_id', lessonPlanIds);
    if (studentId) query = query.eq('student_id', studentId);
    const { data } = await query;
    return (data || []).map((r: any) => ({
      id: r.id, lessonPlanId: r.lesson_plan_id, studentId: r.student_id, isVerified: r.is_verified,
    }));
  }, [lessonPlanIds?.join(','), studentId]);
}
