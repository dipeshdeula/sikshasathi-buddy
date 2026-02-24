import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTopics } from '@/hooks/use-supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Bot, Send, Eye, Lightbulb, Plus, MessageSquare, Trash2, Menu } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  topic_id: string | null;
  updated_at: string;
}

interface Message {
  role: 'user' | 'coach';
  content: string;
  hints?: string[];
  practiceQuestions?: string[];
}

const AICoach = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: topics } = useTopics();
  const isMobile = useIsMobile();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const topic = topicId && topicId !== '__none__' ? topics.find(t => t.id === topicId) : null;

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('coach_conversations')
      .select('id, title, topic_id, updated_at')
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false });
    if (data) setConversations(data);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Load messages when active conversation changes (skip if we're mid-send)
  useEffect(() => {
    if (!activeConvoId) { setMessages([]); return; }
    if (sendingRef.current) return;
    (async () => {
      const { data } = await supabase
        .from('coach_messages')
        .select('role, content, hints, practice_questions')
        .eq('conversation_id', activeConvoId)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(data.map(m => ({
          role: m.role as 'user' | 'coach',
          content: m.content,
          hints: m.hints as string[] | undefined,
          practiceQuestions: m.practice_questions as string[] | undefined,
        })));
      }
    })();
  }, [activeConvoId]);

  // Restore topic when selecting a conversation
  useEffect(() => {
    if (activeConvoId) {
      const convo = conversations.find(c => c.id === activeConvoId);
      setTopicId(convo?.topic_id || '');
    }
  }, [activeConvoId, conversations]);

  // Scroll to bottom on new messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const newChat = () => {
    setActiveConvoId(null);
    setMessages([]);
    setTopicId('');
    setInput('');
    setSidebarOpen(false);
  };

  const selectConversation = (id: string) => {
    setActiveConvoId(id);
    setSidebarOpen(false);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('coach_conversations').delete().eq('id', id);
    if (activeConvoId === id) newChat();
    fetchConversations();
  };

  const ensureConversation = async (): Promise<string> => {
    if (activeConvoId) return activeConvoId;
    const { data, error } = await supabase
      .from('coach_conversations')
      .insert({ student_id: user!.id, topic_id: (topicId && topicId !== '__none__' ? topicId : null), title: 'New Chat' })
      .select('id')
      .single();
    if (error || !data) throw new Error('Failed to create conversation');
    // Set ID without triggering message reload (sendingRef guards it)
    setActiveConvoId(data.id);
    fetchConversations();
    return data.id;
  };

  const askCoach = async () => {
    if (!input.trim()) return;
    const question = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);
    sendingRef.current = true;

    try {
      const convoId = await ensureConversation();

      // Insert user message
      await supabase.from('coach_messages').insert({
        conversation_id: convoId, role: 'user', content: question,
      });

      const resp = await aiService.generateCoachResponse({
        topic: topic?.title || 'General',
        question,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
      });

      // Insert coach response
      await supabase.from('coach_messages').insert({
        conversation_id: convoId, role: 'coach', content: resp.explanation,
        hints: resp.hints?.length ? resp.hints : null,
        practice_questions: resp.practiceQuestions?.length ? resp.practiceQuestions : null,
      });

      // Update conversation timestamp & auto-title
      const isFirst = messages.filter(m => m.role === 'user').length === 0;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (isFirst) {
        const prefix = topic ? `${topic.title}: ` : '';
        updates.title = `${prefix}${question.slice(0, 50)}${question.length > 50 ? '…' : ''}`;
      }
      await supabase.from('coach_conversations').update(updates).eq('id', convoId);
      fetchConversations();

      setMessages(prev => [...prev, {
        role: 'coach', content: resp.explanation, hints: resp.hints, practiceQuestions: resp.practiceQuestions,
      }]);
    } catch (err: any) {
      toast({ title: 'Coach Error', description: err.message || 'Failed to get response', variant: 'destructive' });
    }
    setLoading(false);
    sendingRef.current = false;
    await supabase.from('audit_logs').insert({
      actor_user_id: user?.id || null, action: 'coach_question',
      entity_type: 'ai_coach', entity_id: topicId || null,
      metadata_json: { question },
    });
  };

  const showAnswer = async () => {
    setLoading(true);
    sendingRef.current = true;
    try {
      const convoId = await ensureConversation();

      const requestContent = 'Show me the full answer and explanation';
      setMessages(prev => [...prev, { role: 'user', content: requestContent }]);
      await supabase.from('coach_messages').insert({ conversation_id: convoId, role: 'user', content: requestContent });

      const resp = await aiService.generateCoachResponse({
        topic: topic?.title || 'General',
        question: requestContent,
        showAnswer: true,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
      });

      await supabase.from('coach_messages').insert({
        conversation_id: convoId, role: 'coach', content: resp.explanation,
      });
      await supabase.from('coach_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convoId);
      fetchConversations();

      setMessages(prev => [...prev, { role: 'coach', content: resp.explanation }]);
    } catch (err: any) {
      toast({ title: 'Coach Error', description: err.message || 'Failed to get answer', variant: 'destructive' });
    }
    setLoading(false);
    sendingRef.current = false;
    await supabase.from('audit_logs').insert({
      actor_user_id: user?.id || null, action: 'coach_show_answer',
      entity_type: 'ai_coach', entity_id: topicId || null,
    });
  };

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <Button onClick={newChat} className="m-3 gap-2" size="sm">
        <Plus className="h-4 w-4" /> New Chat
      </Button>
      <ScrollArea className="flex-1" type="always">
        <div className="px-2 space-y-1 pb-2">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm flex items-center gap-2 group transition-colors ${
                c.id === activeConvoId
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="flex-1 min-w-0 truncate">{c.title}</span>
              <button
                onClick={e => deleteConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="animate-fade-in flex h-[calc(100vh-8rem)]">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="w-64 border-r border-border bg-card shrink-0 flex flex-col">
          {sidebarContent}
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle>Conversations</SheetTitle>
                </SheetHeader>
                {sidebarContent}
              </SheetContent>
            </Sheet>
          )}
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">AI Learning Coach</h1>
            <p className="text-xs text-muted-foreground truncate">Ask me anything — I'll guide you step by step!</p>
          </div>
          <div className="w-48 shrink-0">
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger className="truncate"><SelectValue placeholder="Any topic" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground">No specific topic</SelectItem>
                {topics.map(t => <SelectItem key={t.id} value={t.id} className="max-w-[250px] truncate">{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 bg-secondary/30 p-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ask me anything! Optionally pick a topic for focused help.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl p-4 ${
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border shadow-card'
              }`}>
                <p className="text-sm whitespace-pre-line">{m.content}</p>
                {m.hints && m.hints.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Hints:</p>
                    {m.hints.map((h, j) => (
                      <p key={j} className="text-xs bg-accent/10 rounded-lg p-2">{h}</p>
                    ))}
                  </div>
                )}
                {m.practiceQuestions && m.practiceQuestions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold">Practice:</p>
                    {m.practiceQuestions.map((q, j) => (
                      <p key={j} className="text-xs text-muted-foreground">• {q}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-xl p-4 shadow-card">
                <p className="text-sm text-muted-foreground animate-pulse-soft">Thinking…</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askCoach()}
            placeholder={topic ? `Ask about ${topic.title}…` : 'Ask me anything…'}
            disabled={loading}
          />
          <Button onClick={askCoach} disabled={!input.trim() || loading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
          <Button onClick={showAnswer} variant="outline" size="icon" disabled={messages.length === 0 || loading} title="Show Answer">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AICoach;
