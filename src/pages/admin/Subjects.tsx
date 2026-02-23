import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubjectWithTopics {
  id: string;
  name: string;
  gradeName: string;
  units: { id: string; title: string; topics: { id: string; title: string; difficultyLevel: string }[] }[];
}

const AdminSubjects = () => {
  const [data, setData] = useState<SubjectWithTopics[]>([]);

  useEffect(() => {
    supabase
      .from('subjects')
      .select('id, name, grades(name), units(id, title, order_index, topics(id, title, difficulty_level, order_index))')
      .order('name')
      .then(({ data: rows }) => {
        if (rows) {
          setData(rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            gradeName: r.grades?.name || '',
            units: (r.units || [])
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((u: any) => ({
                id: u.id,
                title: u.title,
                topics: (u.topics || []).sort((a: any, b: any) => a.order_index - b.order_index).map((t: any) => ({
                  id: t.id, title: t.title, difficultyLevel: t.difficulty_level || 'Medium',
                })),
              })),
          })));
        }
      });
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Subjects & Topics</h1>

      {data.map(s => (
        <div key={s.id} className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-1">{s.name}</h2>
          <p className="text-xs text-muted-foreground mb-4">{s.gradeName}</p>
          {s.units.map(u => (
            <div key={u.id} className="mb-4">
              <h3 className="text-sm font-semibold text-primary mb-2">{u.title}</h3>
              <div className="space-y-2 ml-4">
                {u.topics.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{t.difficultyLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default AdminSubjects;
