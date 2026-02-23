import { db } from '@/lib/store';

const AdminSubjects = () => {
  const subjects = db.subjects.getAll();
  const topics = db.topics.getAll();

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Subjects & Topics</h1>

      {subjects.map(s => {
        const subTopics = topics.filter(t => t.subjectId === s.id);
        return (
          <div key={s.id} className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">{s.name}</h2>
            <div className="space-y-2">
              {subTopics.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">Grade {t.grade}</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{t.cdcTag}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminSubjects;
