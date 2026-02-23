import { db } from '@/lib/store';

const AdminClasses = () => {
  const classes = db.classes.getAll();

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Class Management</h1>

      {classes.map(c => {
        const teacher = db.users.getById(c.teacherId);
        const students = db.classes.getStudents(c.id);
        return (
          <div key={c.id} className="bg-card rounded-xl border border-border p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{c.name}</h2>
                <p className="text-sm text-muted-foreground">Grade: {c.gradeId ? 'Assigned' : 'N/A'} · Teacher: {teacher?.name || 'Unassigned'}</p>
              </div>
              <span className="bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full">
                {students.length} students
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {students.map((s: any) => (
                <div key={s.id} className="bg-secondary rounded-lg p-2 text-center">
                  <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminClasses;
