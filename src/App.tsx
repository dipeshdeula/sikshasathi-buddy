import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { syncFromSupabase } from "@/lib/store";
import AppLayout from "./components/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Teacher
import TeacherDashboard from "./pages/teacher/Dashboard";
import LessonPlanBuilder from "./pages/teacher/LessonPlanBuilder";
import QuizBuilder from "./pages/teacher/QuizBuilder";
import ResultsEntry from "./pages/teacher/ResultsEntry";
import MasteryDashboard from "./pages/teacher/MasteryDashboard";
import WeeklyReports from "./pages/teacher/WeeklyReports";
import CDCUpload from "./pages/teacher/CDCUpload";
import TeacherChallenges from "./pages/teacher/Challenges";
import StudentRoster from "./pages/teacher/StudentRoster";
// KPI is now integrated into main Dashboard
import Presentations from "./pages/teacher/Presentations";

// Student
import StudentHome from "./pages/student/Home";
import AICoach from "./pages/student/AICoach";
import CheckIn from "./pages/student/CheckIn";
import StudentProgress from "./pages/student/Progress";
import StudentChallenges from "./pages/student/Challenges";
import StudentPresentations from "./pages/student/Presentations";
import QuizSolver from "./pages/student/QuizSolver";

// Parent
import ParentSnapshot from "./pages/parent/Snapshot";
import ParentReports from "./pages/parent/Reports";
import ParentNotifications from "./pages/parent/Notifications";

// Admin
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminClasses from "./pages/admin/Classes";
import AdminSubjects from "./pages/admin/Subjects";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role.toLowerCase())) return <Navigate to={`/${user.role.toLowerCase()}`} />;
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to={`/${user.role.toLowerCase()}`} />;
  return <>{children}</>;
};

// Sync data from Supabase after auth
const SyncLayer = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  useEffect(() => {
    if (user) syncFromSupabase();
  }, [user]);
  return <>{children}</>;
};

const AppRoutes = () => (
  <SyncLayer>
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/lessons" element={<ProtectedRoute allowedRoles={['teacher']}><LessonPlanBuilder /></ProtectedRoute>} />
      <Route path="/teacher/quizzes" element={<ProtectedRoute allowedRoles={['teacher']}><QuizBuilder /></ProtectedRoute>} />
      <Route path="/teacher/results" element={<ProtectedRoute allowedRoles={['teacher']}><ResultsEntry /></ProtectedRoute>} />
      <Route path="/teacher/mastery" element={<ProtectedRoute allowedRoles={['teacher']}><MasteryDashboard /></ProtectedRoute>} />
      <Route path="/teacher/reports" element={<ProtectedRoute allowedRoles={['teacher']}><WeeklyReports /></ProtectedRoute>} />
      <Route path="/teacher/cdc-upload" element={<ProtectedRoute allowedRoles={['teacher']}><CDCUpload /></ProtectedRoute>} />
      <Route path="/teacher/challenges" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherChallenges /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher']}><StudentRoster /></ProtectedRoute>} />
      {/* KPI integrated into main dashboard */}
      <Route path="/teacher/presentations" element={<ProtectedRoute allowedRoles={['teacher']}><Presentations /></ProtectedRoute>} />

      {/* Student routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentHome /></ProtectedRoute>} />
      <Route path="/student/coach" element={<ProtectedRoute allowedRoles={['student']}><AICoach /></ProtectedRoute>} />
      <Route path="/student/checkin" element={<ProtectedRoute allowedRoles={['student']}><CheckIn /></ProtectedRoute>} />{/* Feedback */}
      <Route path="/student/progress" element={<ProtectedRoute allowedRoles={['student']}><StudentProgress /></ProtectedRoute>} />
      <Route path="/student/challenges" element={<ProtectedRoute allowedRoles={['student']}><StudentChallenges /></ProtectedRoute>} />
      <Route path="/student/quizzes" element={<ProtectedRoute allowedRoles={['student']}><QuizSolver /></ProtectedRoute>} />
      <Route path="/student/presentations" element={<ProtectedRoute allowedRoles={['student']}><StudentPresentations /></ProtectedRoute>} />

      {/* Parent routes */}
      <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentSnapshot /></ProtectedRoute>} />
      <Route path="/parent/reports" element={<ProtectedRoute allowedRoles={['parent']}><ParentReports /></ProtectedRoute>} />
      <Route path="/parent/notifications" element={<ProtectedRoute allowedRoles={['parent']}><ParentNotifications /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['admin']}><AdminClasses /></ProtectedRoute>} />
      <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['admin']}><AdminSubjects /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </SyncLayer>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
