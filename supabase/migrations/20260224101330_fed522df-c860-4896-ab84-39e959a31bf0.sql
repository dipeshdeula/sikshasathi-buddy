
-- Create coach_conversations table
CREATE TABLE public.coach_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  topic_id uuid REFERENCES public.topics(id),
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create coach_messages table
CREATE TABLE public.coach_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  hints jsonb,
  practice_questions jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_coach_conversations_student ON public.coach_conversations(student_id);
CREATE INDEX idx_coach_messages_conversation ON public.coach_messages(conversation_id);

-- Enable RLS
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

-- RLS for coach_conversations: students manage their own
CREATE POLICY "Students manage own conversations"
  ON public.coach_conversations FOR ALL
  USING (student_id = auth.uid());

-- RLS for coach_messages: students can SELECT/INSERT on their own conversations
CREATE POLICY "Students read own messages"
  ON public.coach_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coach_conversations
    WHERE id = coach_messages.conversation_id AND student_id = auth.uid()
  ));

CREATE POLICY "Students insert own messages"
  ON public.coach_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.coach_conversations
    WHERE id = coach_messages.conversation_id AND student_id = auth.uid()
  ));
