import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2, CheckCircle, XCircle, Sparkles, BookOpen, ChevronDown, ChevronRight, ShieldCheck, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CdcUpload {
  id: string;
  file_name: string;
  grade_name: string | null;
  subject_name: string | null;
  status: string;
  extracted_data: any;
  error_message: string | null;
  created_at: string;
}

const CDCUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploads, setUploads] = useState<CdcUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [gradeName, setGradeName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('paste');
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    const { data } = await supabase
      .from('cdc_uploads')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUploads(data as CdcUpload[]);
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const text = await file.text();
      await processContent(text, file.name);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) {
      toast({ title: 'Please paste CDC content first', variant: 'destructive' });
      return;
    }
    await processContent(pasteContent, `CDC-${subjectName || 'Document'}-${Date.now()}.txt`);
    setPasteContent('');
  };

  const processContent = async (content: string, fileName: string) => {
    if (!user) return;
    setAnalyzing(true);
    try {
      const { data: upload, error: insertErr } = await supabase
        .from('cdc_uploads')
        .insert({
          teacher_id: user.id,
          file_name: fileName,
          file_path: `uploads/${user.id}/${fileName}`,
          grade_name: gradeName || null,
          subject_name: subjectName || null,
          status: 'pending',
        })
        .select()
        .single();

      if (insertErr || !upload) throw new Error('Failed to create upload record');

      const result = await aiService.analyzeCDC({
        uploadId: upload.id,
        fileContent: content.substring(0, 50000),
        gradeName: gradeName || undefined,
        subjectName: subjectName || undefined,
      });

      toast({
        title: '🔍 Analysis Complete — Review Required',
        description: `Found ${result.units} units and ${result.topics} topics for ${result.subject} (${result.grade}). Please review and approve.`,
      });

      loadUploads();
    } catch (err: any) {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApprove = async (uploadId: string) => {
    setApproving(uploadId);
    try {
      const { data, error } = await supabase.functions.invoke('approve-cdc', {
        body: { uploadId },
      });

      if (error) throw new Error(error.message || 'Approval failed');
      if (data?.error) throw new Error(data.error);

      toast({
        title: '✅ Curriculum Approved & Saved!',
        description: `${data.units} units and ${data.topics} topics saved to the database for ${data.subject} (${data.grade}).`,
      });

      loadUploads();
    } catch (err: any) {
      toast({ title: 'Approval failed', description: err.message, variant: 'destructive' });
    } finally {
      setApproving(null);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'analyzed': return <ShieldCheck className="h-5 w-5 text-warning" />;
      case 'processing': return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'error': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return { text: 'APPROVED', className: 'bg-success/10 text-success' };
      case 'analyzed': return { text: 'AWAITING APPROVAL', className: 'bg-yellow-500/10 text-yellow-600' };
      case 'processing': return { text: 'PROCESSING', className: 'bg-primary/10 text-primary' };
      case 'error': return { text: 'ERROR', className: 'bg-destructive/10 text-destructive' };
      default: return { text: 'PENDING', className: 'bg-muted text-muted-foreground' };
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" /> Upload Curriculum
        </h1>
        <p className="text-muted-foreground">
          Upload or paste curriculum content. AI will extract the structure — you review and approve before saving.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
        <h2 className="text-lg font-semibold text-foreground">New Curriculum Upload</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Grade / Class (optional - AI will infer)</Label>
            <Select value={gradeName} onValueChange={setGradeName}>
              <SelectTrigger><SelectValue placeholder="Select or let AI detect" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => (
                  <SelectItem key={i} value={`Grade ${i + 1}`}>Grade {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject (optional)</Label>
            <Input
              value={subjectName}
              onChange={e => setSubjectName(e.target.value)}
              placeholder="e.g., Mathematics, Science, Nepali..."
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant={inputMode === 'paste' ? 'default' : 'outline'} size="sm" onClick={() => setInputMode('paste')}>
            <FileText className="h-4 w-4 mr-1" /> Paste Content
          </Button>
          <Button variant={inputMode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setInputMode('file')}>
            <Upload className="h-4 w-4 mr-1" /> Upload File
          </Button>
        </div>

        {inputMode === 'paste' ? (
          <div className="space-y-3">
            <div>
              <Label>Paste CDC Curriculum Content</Label>
              <Textarea
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
                placeholder="Paste the CDC curriculum text here... Include units, topics, learning outcomes, teaching guidelines, etc."
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {pasteContent.length > 0 ? `${pasteContent.length} characters` : 'Paste your CDC document text'}
              </p>
            </div>
            <Button onClick={handlePasteSubmit} disabled={analyzing || !pasteContent.trim()} className="gap-2">
              {analyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing with AI...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Analyze with AI</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload a text file (.txt, .csv, .md)</p>
              <p className="text-xs text-muted-foreground mt-1">PDF support coming soon - for now, copy-paste PDF content</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.md,.text"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
            {uploading && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </div>
            )}
          </div>
        )}

        {analyzing && (
          <div className="bg-primary/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">AI is analyzing your CDC document...</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Extracting grades, subjects, units, topics, learning outcomes, teaching guidelines, and assessment indicators.
            </p>
            <Progress value={65} className="h-2" />
          </div>
        )}
      </div>

      {/* Upload History */}
      {uploads.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Upload History ({uploads.length})
          </h2>
          <div className="space-y-3">
            {uploads.map(u => {
              const status = statusLabel(u.status);
              return (
                <div key={u.id} className="border border-border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => setExpandedUpload(expandedUpload === u.id ? null : u.id)}
                  >
                    {statusIcon(u.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.grade_name && `${u.grade_name} · `}
                        {u.subject_name && `${u.subject_name} · `}
                        {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${status.className}`}>
                      {status.text}
                    </span>
                    {expandedUpload === u.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>

                  {expandedUpload === u.id && (
                    <div className="border-t border-border p-4 bg-secondary/30">
                      {u.status === 'error' && u.error_message && (
                        <p className="text-sm text-destructive mb-2">{u.error_message}</p>
                      )}

                      {(u.status === 'analyzed' || u.status === 'completed') && u.extracted_data && (
                        <div className="space-y-4">
                          {/* Summary badges */}
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                              <BookOpen className="h-3 w-3 inline mr-1" />
                              {u.extracted_data.units?.length || 0} Units
                            </span>
                            <span className="bg-accent/10 text-accent-foreground px-2 py-1 rounded">
                              {(u.extracted_data.units || []).reduce((sum: number, unit: any) => sum + (unit.topics?.length || 0), 0)} Topics
                            </span>
                            {u.extracted_data.grade?.name && (
                              <span className="bg-muted text-muted-foreground px-2 py-1 rounded">
                                {u.extracted_data.grade.name}
                              </span>
                            )}
                            {u.extracted_data.subject?.name && (
                              <span className="bg-muted text-muted-foreground px-2 py-1 rounded">
                                {u.extracted_data.subject.name}
                              </span>
                            )}
                          </div>

                          {/* Units & Topics detail */}
                          {(u.extracted_data.units || []).map((unit: any, i: number) => (
                            <div key={i} className="ml-2">
                              <p className="text-sm font-semibold text-foreground">
                                {i + 1}. {unit.title}
                                {unit.estimated_hours && (
                                  <span className="text-xs text-muted-foreground font-normal ml-2">({unit.estimated_hours}h)</span>
                                )}
                              </p>
                              <div className="ml-4 space-y-1 mt-1">
                                {(unit.topics || []).map((topic: any, j: number) => (
                                  <div key={j} className="text-xs text-muted-foreground">
                                    <span>• {topic.title}</span>
                                    {topic.difficulty_level && (
                                      <span className="ml-1 text-primary">({topic.difficulty_level})</span>
                                    )}
                                    {topic.learning_outcomes?.length > 0 && (
                                      <span className="ml-1 text-muted-foreground">
                                        · {topic.learning_outcomes.length} outcomes
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* Approve button for analyzed uploads */}
                          {u.status === 'analyzed' && (
                            <div className="pt-3 border-t border-border">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                  Review the extracted curriculum above. Click approve to save to the database.
                                </p>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(u.id);
                                  }}
                                  disabled={approving === u.id}
                                  className="gap-2"
                                >
                                  {approving === u.id ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Approving...</>
                                  ) : (
                                    <><ShieldCheck className="h-4 w-4" /> Approve & Save</>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}

                          {u.status === 'completed' && (
                            <div className="pt-3 border-t border-border">
                              <p className="text-sm text-success flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" /> Approved and saved to curriculum database.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CDCUpload;
