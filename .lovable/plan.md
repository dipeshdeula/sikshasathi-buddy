

## Save AI Coach Chat History and Allow New Chats

### Overview
Add persistent chat history for the AI Coach so students can revisit past conversations and start new ones. This requires two new database tables and a redesigned AICoach UI with a conversation sidebar.

### Step 1: Database Migration
Create two new tables:

```text
coach_conversations
  - id (uuid, PK)
  - student_id (uuid, NOT NULL)
  - topic_id (uuid, nullable)
  - title (text, NOT NULL, default 'New Chat')
  - created_at (timestamptz)
  - updated_at (timestamptz)

coach_messages
  - id (uuid, PK)
  - conversation_id (uuid, NOT NULL, FK -> coach_conversations)
  - role (text, NOT NULL) -- 'user' or 'coach'
  - content (text, NOT NULL)
  - hints (jsonb, nullable)
  - practice_questions (jsonb, nullable)
  - created_at (timestamptz)
```

RLS policies:
- Students can SELECT, INSERT, UPDATE, DELETE their own conversations (`student_id = auth.uid()`)
- Students can SELECT, INSERT their own messages (via join to conversation's `student_id`)

### Step 2: Update AICoach UI (`src/pages/student/AICoach.tsx`)

Redesign the page layout:

```text
+------------------+-----------------------------------+
| Conversation     |  Chat Area                        |
| Sidebar          |                                   |
|                  |  [Topic selector]                 |
| [+ New Chat]     |                                   |
|                  |  Messages...                      |
| - Chat title 1   |                                   |
| - Chat title 2   |                                   |
| - Chat title 3   |  [Input] [Send] [Show Answer]     |
+------------------+-----------------------------------+
```

Key behaviors:
- **New Chat button**: Creates a new `coach_conversations` row, clears the message area
- **Conversation list**: Fetches all conversations for the student, ordered by `updated_at DESC`
- **Selecting a conversation**: Loads its messages from `coach_messages`, restores the topic
- **Sending a message**: Inserts the user message into `coach_messages`, calls the AI, inserts the coach response
- **Auto-title**: After the first exchange, update the conversation title to include the topic name and first question snippet
- **Delete conversation**: Allow removing old chats

### Step 3: Message Persistence Logic

When `askCoach()` is called:
1. If no active conversation exists, create one in `coach_conversations`
2. Insert user message into `coach_messages`
3. Call AI service (existing `generateCoachResponse`)
4. Insert coach response into `coach_messages` (with hints/practice_questions as JSONB)
5. Update `coach_conversations.updated_at`

When `showAnswer()` is called:
1. Same flow -- insert the "show answer" request and response as messages

### Technical Details

- No changes needed to the edge function (`generate-coach-response`) -- it already works
- Conversation history sent to the AI will be loaded from `coach_messages` instead of in-memory state
- The sidebar will use a simple `useEffect` fetch on mount, re-fetched after creating/deleting conversations
- Mobile: sidebar collapses into a sheet/drawer triggered by a menu button

