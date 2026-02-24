import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import OfflineBanner from "./OfflineBanner";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  ClipboardList,
  BarChart3,
  FileText,
  Bell,
  Users,
  LogOut,
  Menu,
  X,
  GraduationCap,
  SmilePlus,
  TrendingUp,
  Home,
  Bot,
  ChevronRight,
  Upload,
  Trophy,
  Presentation,
  PieChart,
} from "lucide-react";

const navItems: Record<string, { label: string; icon: ReactNode; path: string }[]> = {
  teacher: [
    { label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, path: "/teacher" },
    { label: "CDC Upload", icon: <Upload className="h-5 w-5" />, path: "/teacher/cdc-upload" },
    { label: "Lesson Plans", icon: <BookOpen className="h-5 w-5" />, path: "/teacher/lessons" },
    { label: "Presentations", icon: <Presentation className="h-5 w-5" />, path: "/teacher/presentations" },
    { label: "Quizzes", icon: <FileQuestion className="h-5 w-5" />, path: "/teacher/quizzes" },
    { label: "Challenges", icon: <Trophy className="h-5 w-5" />, path: "/teacher/challenges" },
    { label: "Students", icon: <Users className="h-5 w-5" />, path: "/teacher/students" },
    { label: "Mastery", icon: <BarChart3 className="h-5 w-5" />, path: "/teacher/mastery" },
    { label: "Weekly Reports", icon: <FileText className="h-5 w-5" />, path: "/teacher/reports" },
  ],
  student: [
    { label: "Home", icon: <Home className="h-5 w-5" />, path: "/student" },
    { label: "AI Coach", icon: <Bot className="h-5 w-5" />, path: "/student/coach" },
    { label: "Quizzes", icon: <FileQuestion className="h-5 w-5" />, path: "/student/quizzes" },
    { label: "Challenges", icon: <Trophy className="h-5 w-5" />, path: "/student/challenges" },
    { label: "Presentations", icon: <Presentation className="h-5 w-5" />, path: "/student/presentations" },
    { label: "Feedback", icon: <SmilePlus className="h-5 w-5" />, path: "/student/checkin" },
    { label: "My Progress", icon: <TrendingUp className="h-5 w-5" />, path: "/student/progress" },
    { label: "Self Learning", icon: <BookOpen className="h-5 w-5" />, path: "/student/self-learning" },
  ],
  parent: [
    { label: "Snapshot", icon: <Home className="h-5 w-5" />, path: "/parent" },
    { label: "Reports", icon: <FileText className="h-5 w-5" />, path: "/parent/reports" },
    { label: "Notifications", icon: <Bell className="h-5 w-5" />, path: "/parent/notifications" },
  ],
  admin: [
    { label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, path: "/admin" },
    { label: "Users", icon: <Users className="h-5 w-5" />, path: "/admin/users" },
    { label: "Classes", icon: <GraduationCap className="h-5 w-5" />, path: "/admin/classes" },
    { label: "Subjects", icon: <BookOpen className="h-5 w-5" />, path: "/admin/subjects" },
  ],
};

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;
  const roleKey = user.role.toLowerCase();
  const items = navItems[roleKey] || [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 gradient-hero flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="p-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">NAVO.AI</h1>
            <p className="text-xs text-primary-foreground/60 capitalize">{roleKey} Panel</p>
          </div>
          <button className="lg:hidden ml-auto text-primary-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-primary-foreground/70 hover:bg-sidebar-accent/50 hover:text-primary-foreground"
                }`}
              >
                {item.icon}
                {item.label}
                {active && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold text-sidebar-accent-foreground">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary-foreground truncate">{user.name}</p>
              <p className="text-xs text-primary-foreground/50 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm text-primary-foreground/60 hover:bg-sidebar-accent/50 hover:text-primary-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <OfflineBanner />
        <header className="h-14 border-b border-border bg-card px-4 flex items-center gap-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1" />
          <LanguageSwitcher />
          <Bell className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
