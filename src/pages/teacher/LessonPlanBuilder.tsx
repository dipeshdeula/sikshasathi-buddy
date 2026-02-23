import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Save, BookOpen, Pencil, Trash2, FileText, GraduationCap } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Grade, Subject, Unit, Topic, LessonPlan, TeacherGuidelineEntry } from '@/lib/data';
import { mapGrade, mapSubject, mapUnit, mapTopic, mapLessonPlan, mapTeacherGuidelineEntry } from '@/lib/data';

const LessonPlanBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Curriculum data
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([]);
  const [teachingGuidelinesData, setTeachingGuidelinesData] = useState<string[]>([]);
  const [assessmentIndicators, setAssessmentIndicators] = useState<string[]>([]);

  // Filters
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [classLevel, setClassLevel] = useState('Medium');
  const [durationType, setDurationType] = useState('Daily');

  // Lesson Plan fields
  const [objectives, setObjectives] = useState('');
  const [homework, setHomework] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<(LessonPlan & { topicTitle?: string; unitTitle?: string; subjectName?: string })[]>([]);
  const [editingLpId, setEditingLpId] = useState<string | null>(null);

  // Teacher Guideline fields
  const [tgTeachingScript, setTgTeachingScript] = useState('');
  const [tgBoardwork, setTgBoardwork] = useState('');
  const [tgReferenceLinks, setTgReferenceLinks] = useState('');
  const [tgPresentation, setTgPresentation] = useState('');
  const [tgGenerating, setTgGenerating] = useState(false);
  const [teacherGuidelines, setTeacherGuidelines] = useState<(TeacherGuidelineEntry & { topicTitle?: string; unitTitle?: string; subjectName?: string })[]>([]);
  const [editingTgId, setEditingTgId] = useState<string | null>(null);

  // TG filters (separate)
  const [tgGradeId, setTgGradeId] = useState('');
  const [tgSubjectId, setTgSubjectId] = useState('');
  const [tgUnitId, setTgUnitId] = useState('');
  const [tgTopicId, setTgTopicId] = useState('');
  const [tgSubjects, setTgSubjects] = useState<Subject[]>([]);
  const [tgUnits, setTgUnits] = useState<Unit[]>([]);
  const [tgTopics, setTgTopics] = useState<Topic[]>([]);

  // Load grades on mount
  useEffect(() => {
    supabase.from('grades').select('*').order('name').then(({ data }) => {
      if (data) setGrades(data.map(mapGrade));
    });
    loadLessonPlans();
    loadTeacherGuidelines();
  }, []);

  // Cascade: grade → subjects
  useEffect(() => {
    if (!gradeId) { setSubjects([]); return; }
    supabase.from('subjects').select('*').eq('grade_id', gradeId).order('name').then(({ data }) => {
      if (data) setSubjects(data.map(mapSubject));
    });
    setSubjectId(''); setUnitId(''); setTopicId('');
  }, [gradeId]);

  useEffect(() => {
    if (!tgGradeId) { setTgSubjects([]); return; }
    supabase.from('subjects').select('*').eq('grade_id', tgGradeId).order('name').then(({ data }) => {
      if (data) setTgSubjects(data.map(mapSubject));
    });
    setTgSubjectId(''); setTgUnitId(''); setTgTopicId('');
  }, [tgGradeId]);

  // Cascade: subject → units
  useEffect(() => {
    if (!subjectId) { setUnits([]); return; }
    supabase.from('units').select('*').eq('subject_id', subjectId).order('order_index').then(({ data }) => {
      if (data) setUnits(data.map(mapUnit));
    });
    setUnitId(''); setTopicId('');
  }, [subjectId]);

  useEffect(() => {
    if (!tgSubjectId) { setTgUnits([]); return; }
    supabase.from('units').select('*').eq('subject_id', tgSubjectId).order('order_index').then(({ data }) => {
      if (data) setTgUnits(data.map(mapUnit));
    });
    setTgUnitId(''); setTgTopicId('');
  }, [tgSubjectId]);

  // Cascade: unit → topics
  useEffect(() => {
    if (!unitId) { setTopics([]); return; }
    supabase.from('topics').select('*').eq('unit_id', unitId).order('order_index').then(({ data }) => {
      if (data) setTopics(data.map(mapTopic));
    });
    setTopicId('');
  }, [unitId]);

  useEffect(() => {
    if (!tgUnitId) { setTgTopics([]); return; }
    supabase.from('topics').select('*').eq('unit_id', tgUnitId).order('order_index').then(({ data }) => {
      if (data) setTgTopics(data.map(mapTopic));
    });
    setTgTopicId('');
  }, [tgUnitId]);

  // Load learning outcomes + guidelines when topic selected
  useEffect(() => {
    if (!topicId) { setLearningOutcomes([]); return; }
    supabase.from('learning_outcomes').select('outcome_text').eq('topic_id', topicId).then(({ data }) => {
      if (data) setLearningOutcomes(data.map(d => d.outcome_text));
    });
  }, [topicId]);

  useEffect(() => {
    if (!tgTopicId) { setTeachingGuidelinesData([]); setAssessmentIndicators([]); return; }
    Promise.all([
      supabase.from('teaching_guidelines').select('guideline_text').eq('topic_id', tgTopicId),
      supabase.from('assessment_indicators').select('indicator_text').eq('topic_id', tgTopicId),
    ]).then(([tg, ai]) => {
      if (tg.data) setTeachingGuidelinesData(tg.data.map(d => d.guideline_text));
      if (ai.data) setAssessmentIndicators(ai.data.map(d => d.indicator_text));
    });
  }, [tgTopicId]);

  const loadLessonPlans = async () => {
    const { data } = await supabase
      .from('lesson_plans')
      .select('*, topics(title, unit_id, units(title, subject_id, subjects(name)))')
      .order('created_at', { ascending: false });
    if (data) {
      setLessonPlans(data.map((r: any) => ({
        ...mapLessonPlan(r),
        topicTitle: r.topics?.title || '',
        unitTitle: r.topics?.units?.title || '',
        subjectName: r.topics?.units?.subjects?.name || '',
      })));
    }
  };

  const loadTeacherGuidelines = async () => {
    const { data } = await supabase
      .from('teacher_guidelines')
      .select('*, topics(title, unit_id, units(title, subject_id, subjects(name)))')
      .order('created_at', { ascending: false });
    if (data) {
      setTeacherGuidelines(data.map((r: any) => ({
        ...mapTeacherGuidelineEntry(r),
        topicTitle: r.topics?.title || '',
        unitTitle: r.topics?.units?.title || '',
        subjectName: r.topics?.units?.subjects?.name || '',
      })));
    }
  };

  // --- Lesson Plan CRUD ---
  const handleGenerateLP = async () => {
    if (!topicId) { toast({ title: 'Select a topic first', variant: 'destructive' }); return; }
    const topic = topics.find(t => t.id === topicId);
    const unit = units.find(u => u.id === unitId);
    const subject = subjects.find(s => s.id === subjectId);
    if (!topic || !subject) return;
    setGenerating(true);
    const result = await aiService.generateLessonPlan({
      subject: subject.name, topic: topic.title, unit: unit?.title || '',
      classLevel, durationType, learningOutcomes,
    });
    setObjectives(result.objectives);
    setHomework(result.homework);
    setGenerating(false);
    toast({ title: 'AI generated lesson plan!' });
  };

  const handleSaveLP = async () => {
    if (!topicId || !user) { toast({ title: 'Missing topic', variant: 'destructive' }); return; }
    if (editingLpId) {
      await supabase.from('lesson_plans').update({
        topic_id: topicId, duration_type: durationType, class_level: classLevel,
        objectives, homework, updated_at: new Date().toISOString(),
      }).eq('id', editingLpId);
      setEditingLpId(null);
      toast({ title: 'Lesson plan updated!' });
    } else {
      await supabase.from('lesson_plans').insert({
        teacher_id: user.id, topic_id: topicId, duration_type: durationType,
        class_level: classLevel, objectives, homework, generated_by_ai: generating,
      });
      toast({ title: 'Lesson plan saved!' });
    }
    resetLPForm();
    loadLessonPlans();
  };

  const handleEditLP = (lp: LessonPlan) => {
    setEditingLpId(lp.id);
    setObjectives(lp.objectives);
    setHomework(lp.homework);
    setClassLevel(lp.classLevel);
    setDurationType(lp.durationType);
  };

  const handleDeleteLP = async (id: string) => {
    await supabase.from('lesson_plans').delete().eq('id', id);
    toast({ title: 'Lesson plan deleted' });
    loadLessonPlans();
  };

  const resetLPForm = () => {
    setObjectives(''); setHomework(''); setEditingLpId(null);
  };

  // --- Teacher Guideline CRUD ---
  const handleGenerateTG = async () => {
    if (!tgTopicId) { toast({ title: 'Select a topic first', variant: 'destructive' }); return; }
    const topic = tgTopics.find(t => t.id === tgTopicId);
    const unit = tgUnits.find(u => u.id === tgUnitId);
    const subject = tgSubjects.find(s => s.id === tgSubjectId);
    if (!topic || !subject) return;
    setTgGenerating(true);
    const result = await aiService.generateTeacherGuideline({
      subject: subject.name, topic: topic.title, unit: unit?.title || '',
      classLevel: 'Medium', teachingGuidelines: teachingGuidelinesData,
      assessmentIndicators,
    });
    setTgTeachingScript(result.teachingScript);
    setTgBoardwork(result.boardwork);
    setTgReferenceLinks(result.referenceLinks);
    setTgPresentation(result.presentationContent);
    setTgGenerating(false);
    toast({ title: 'AI generated teacher guideline!' });
  };

  const handleSaveTG = async () => {
    if (!tgTopicId || !user) { toast({ title: 'Missing topic', variant: 'destructive' }); return; }
    if (editingTgId) {
      await supabase.from('teacher_guidelines').update({
        topic_id: tgTopicId, teaching_script: tgTeachingScript, boardwork: tgBoardwork,
        reference_links: tgReferenceLinks, presentation_content: tgPresentation,
        updated_at: new Date().toISOString(),
      }).eq('id', editingTgId);
      setEditingTgId(null);
      toast({ title: 'Guideline updated!' });
    } else {
      await supabase.from('teacher_guidelines').insert({
        teacher_id: user.id, topic_id: tgTopicId, teaching_script: tgTeachingScript,
        boardwork: tgBoardwork, reference_links: tgReferenceLinks,
        presentation_content: tgPresentation, generated_by_ai: true,
      });
      toast({ title: 'Guideline saved!' });
    }
    resetTGForm();
    loadTeacherGuidelines();
  };

  const handleEditTG = (tg: TeacherGuidelineEntry) => {
    setEditingTgId(tg.id);
    setTgTeachingScript(tg.teachingScript);
    setTgBoardwork(tg.boardwork);
    setTgReferenceLinks(tg.referenceLinks);
    setTgPresentation(tg.presentationContent);
  };

  const handleDeleteTG = async (id: string) => {
    await supabase.from('teacher_guidelines').delete().eq('id', id);
    toast({ title: 'Guideline deleted' });
    loadTeacherGuidelines();
  };

  const resetTGForm = () => {
    setTgTeachingScript(''); setTgBoardwork(''); setTgReferenceLinks(''); setTgPresentation(''); setEditingTgId(null);
  };

  const CurriculumFilters = ({
    gId, sId, uId, tId, setGId, setSId, setUId, setTId,
    subs, uns, tops,
  }: {
    gId: string; sId: string; uId: string; tId: string;
    setGId: (v: string) => void; setSId: (v: string) => void;
    setUId: (v: string) => void; setTId: (v: string) => void;
    subs: Subject[]; uns: Unit[]; tops: Topic[];
  }) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <Label>Class Level (Grade)</Label>
        <Select value={gId} onValueChange={setGId}>
          <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
          <SelectContent>
            {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Subject</Label>
        <Select value={sId} onValueChange={setSId} disabled={!gId}>
          <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
          <SelectContent>
            {subs.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Unit</Label>
        <Select value={uId} onValueChange={setUId} disabled={!sId}>
          <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
          <SelectContent>
            {uns.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Topic</Label>
        <Select value={tId} onValueChange={setTId} disabled={!uId}>
          <SelectTrigger><SelectValue placeholder="Select Topic" /></SelectTrigger>
          <SelectContent>
            {tops.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Lesson Plans
        </h1>
        <p className="text-muted-foreground">Create CDC-aligned lesson plans and teaching guidelines with AI</p>
      </div>

      <Tabs defaultValue="lesson-plan" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lesson-plan" className="gap-2">
            <FileText className="h-4 w-4" /> Create New Lesson Plan
          </TabsTrigger>
          <TabsTrigger value="teacher-guideline" className="gap-2">
            <GraduationCap className="h-4 w-4" /> Teacher Guideline
          </TabsTrigger>
        </TabsList>

        {/* === TAB 1: CREATE LESSON PLAN === */}
        <TabsContent value="lesson-plan" className="space-y-6 mt-4">
          <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              {editingLpId ? 'Edit Lesson Plan' : 'New Lesson Plan'}
            </h2>

            <CurriculumFilters
              gId={gradeId} sId={subjectId} uId={unitId} tId={topicId}
              setGId={setGradeId} setSId={setSubjectId} setUId={setUnitId} setTId={setTopicId}
              subs={subjects} uns={units} tops={topics}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Duration</Label>
                <Select value={durationType} onValueChange={setDurationType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class Level</Label>
                <Select value={classLevel} onValueChange={setClassLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {learningOutcomes.length > 0 && (
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">CDC Learning Outcomes (auto-loaded):</p>
                <ul className="text-sm text-foreground space-y-1">
                  {learningOutcomes.map((o, i) => <li key={i}>• {o}</li>)}
                </ul>
              </div>
            )}

            <Button onClick={handleGenerateLP} disabled={generating || !topicId} className="gap-2">
              <Sparkles className="h-4 w-4" /> {generating ? 'Generating…' : 'Generate with AI'}
            </Button>

            <div className="space-y-4">
              <div><Label>Objectives</Label><Textarea value={objectives} onChange={e => setObjectives(e.target.value)} rows={4} /></div>
              <div><Label>Homework / Assessment</Label><Textarea value={homework} onChange={e => setHomework(e.target.value)} rows={3} /></div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveLP} disabled={!objectives && !homework} className="gap-2">
                <Save className="h-4 w-4" /> {editingLpId ? 'Update' : 'Save'} Lesson Plan
              </Button>
              {editingLpId && (
                <Button variant="outline" onClick={resetLPForm}>Cancel Edit</Button>
              )}
            </div>
          </div>

          {/* Saved Lesson Plans Table */}
          {lessonPlans.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Saved Lesson Plans ({lessonPlans.length})
              </h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessonPlans.map(lp => (
                      <TableRow key={lp.id}>
                        <TableCell className="font-medium">{lp.subjectName}</TableCell>
                        <TableCell>{lp.unitTitle}</TableCell>
                        <TableCell>{lp.topicTitle}</TableCell>
                        <TableCell>
                          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded">{lp.durationType}</span>
                        </TableCell>
                        <TableCell>{lp.classLevel}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(lp.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEditLP(lp)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteLP(lp.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* === TAB 2: TEACHER GUIDELINE === */}
        <TabsContent value="teacher-guideline" className="space-y-6 mt-4">
          <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              {editingTgId ? 'Edit Teacher Guideline' : 'Generate Teacher Guideline'}
            </h2>

            <CurriculumFilters
              gId={tgGradeId} sId={tgSubjectId} uId={tgUnitId} tId={tgTopicId}
              setGId={setTgGradeId} setSId={setTgSubjectId} setUId={setTgUnitId} setTId={setTgTopicId}
              subs={tgSubjects} uns={tgUnits} tops={tgTopics}
            />

            {teachingGuidelinesData.length > 0 && (
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">CDC Teaching Guidelines:</p>
                <ul className="text-sm text-foreground space-y-1">
                  {teachingGuidelinesData.map((g, i) => <li key={i}>• {g}</li>)}
                </ul>
              </div>
            )}

            <Button onClick={handleGenerateTG} disabled={tgGenerating || !tgTopicId} className="gap-2">
              <Sparkles className="h-4 w-4" /> {tgGenerating ? 'Generating…' : 'Generate with AI'}
            </Button>

            <div className="space-y-4">
              <div><Label>Teaching Script</Label><Textarea value={tgTeachingScript} onChange={e => setTgTeachingScript(e.target.value)} rows={8} /></div>
              <div><Label>Board Work</Label><Textarea value={tgBoardwork} onChange={e => setTgBoardwork(e.target.value)} rows={6} className="font-mono text-sm" /></div>
              <div><Label>Reference Links / Videos</Label><Textarea value={tgReferenceLinks} onChange={e => setTgReferenceLinks(e.target.value)} rows={4} /></div>
              <div><Label>Presentation Content</Label><Textarea value={tgPresentation} onChange={e => setTgPresentation(e.target.value)} rows={6} /></div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveTG} disabled={!tgTeachingScript && !tgBoardwork} className="gap-2">
                <Save className="h-4 w-4" /> {editingTgId ? 'Update' : 'Save'} Guideline
              </Button>
              {editingTgId && (
                <Button variant="outline" onClick={resetTGForm}>Cancel Edit</Button>
              )}
            </div>
          </div>

          {/* Saved Teacher Guidelines Table */}
          {teacherGuidelines.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Saved Guidelines ({teacherGuidelines.length})
              </h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>AI Generated</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherGuidelines.map(tg => (
                      <TableRow key={tg.id}>
                        <TableCell className="font-medium">{tg.subjectName}</TableCell>
                        <TableCell>{tg.unitTitle}</TableCell>
                        <TableCell>{tg.topicTitle}</TableCell>
                        <TableCell>
                          {tg.generatedByAi ? (
                            <span className="bg-accent/20 text-accent-foreground text-xs px-2 py-0.5 rounded">AI</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Manual</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(tg.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEditTG(tg)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteTG(tg.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LessonPlanBuilder;
