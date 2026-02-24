export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assessment_indicators: {
        Row: {
          assessment_type: string | null
          created_at: string | null
          id: string
          indicator_text: string
          topic_id: string | null
        }
        Insert: {
          assessment_type?: string | null
          created_at?: string | null
          id?: string
          indicator_text: string
          topic_id?: string | null
        }
        Update: {
          assessment_type?: string | null
          created_at?: string | null
          id?: string
          indicator_text?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_indicators_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata_json: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata_json?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cdc_uploads: {
        Row: {
          created_at: string | null
          error_message: string | null
          extracted_data: Json | null
          file_name: string
          file_path: string
          grade_name: string | null
          id: string
          processed_at: string | null
          status: string
          subject_name: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_name: string
          file_path: string
          grade_name?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          subject_name?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          grade_name?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          subject_name?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cdc_uploads_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          answer_text: string
          challenge_id: string
          id: string
          is_winner: boolean
          review_text: string | null
          reviewed_at: string | null
          student_id: string
          submitted_at: string
        }
        Insert: {
          answer_text: string
          challenge_id: string
          id?: string
          is_winner?: boolean
          review_text?: string | null
          reviewed_at?: string | null
          student_id: string
          submitted_at?: string
        }
        Update: {
          answer_text?: string
          challenge_id?: string
          id?: string
          is_winner?: boolean
          review_text?: string | null
          reviewed_at?: string | null
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          class_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          is_active: boolean
          teacher_id: string
          title: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          is_active?: boolean
          teacher_id: string
          title: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          is_active?: boolean
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          student_id: string
        }
        Insert: {
          class_id: string
          student_id: string
        }
        Update: {
          class_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          grade_id: string | null
          id: string
          name: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          grade_id?: string | null
          id?: string
          name: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          grade_id?: string | null
          id?: string
          name?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          academic_year: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          level: string
          name: string
        }
        Insert: {
          academic_year?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          name: string
        }
        Update: {
          academic_year?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          name?: string
        }
        Relationships: []
      }
      learning_outcomes: {
        Row: {
          bloom_level: string | null
          competency_level: string | null
          created_at: string | null
          id: string
          outcome_text: string
          topic_id: string | null
        }
        Insert: {
          bloom_level?: string | null
          competency_level?: string | null
          created_at?: string | null
          id?: string
          outcome_text: string
          topic_id?: string | null
        }
        Update: {
          bloom_level?: string | null
          competency_level?: string | null
          created_at?: string | null
          id?: string
          outcome_text?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_outcomes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          lesson_plan_id: string
          teacher_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_plan_id: string
          teacher_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_plan_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          class_level: string
          created_at: string | null
          duration_type: string
          generated_by_ai: boolean | null
          homework: string | null
          id: string
          objectives: string | null
          teacher_id: string | null
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_level?: string
          created_at?: string | null
          duration_type?: string
          generated_by_ai?: boolean | null
          homework?: string | null
          id?: string
          objectives?: string | null
          teacher_id?: string | null
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_level?: string
          created_at?: string | null
          duration_type?: string
          generated_by_ai?: boolean | null
          homework?: string | null
          id?: string
          objectives?: string | null
          teacher_id?: string | null
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_states: {
        Row: {
          id: string
          mastery_score: number
          student_id: string | null
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          mastery_score?: number
          student_id?: string | null
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          mastery_score?: number
          student_id?: string | null
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mastery_states_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_states_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read_at: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_links: {
        Row: {
          parent_id: string
          student_id: string
        }
        Insert: {
          parent_id: string
          student_id: string
        }
        Update: {
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers_json: Json | null
          id: string
          quiz_id: string | null
          score: number | null
          student_id: string | null
          submitted_at: string | null
        }
        Insert: {
          answers_json?: Json | null
          id?: string
          quiz_id?: string | null
          score?: number | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          answers_json?: Json | null
          id?: string
          quiz_id?: string | null
          score?: number | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          answer_key: string | null
          difficulty: string
          explanation: string | null
          id: string
          options_json: Json | null
          prompt: string
          qtype: string
          quiz_id: string | null
        }
        Insert: {
          answer_key?: string | null
          difficulty: string
          explanation?: string | null
          id?: string
          options_json?: Json | null
          prompt: string
          qtype: string
          quiz_id?: string | null
        }
        Update: {
          answer_key?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          options_json?: Json | null
          prompt?: string
          qtype?: string
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          class_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          topic_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          topic_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          awarded_at: string
          badge_description: string | null
          badge_name: string
          id: string
          points: number
          source_id: string | null
          source_type: string
          student_id: string
        }
        Insert: {
          awarded_at?: string
          badge_description?: string | null
          badge_name: string
          id?: string
          points?: number
          source_id?: string | null
          source_type?: string
          student_id: string
        }
        Update: {
          awarded_at?: string
          badge_description?: string | null
          badge_name?: string
          id?: string
          points?: number
          source_id?: string | null
          source_type?: string
          student_id?: string
        }
        Relationships: []
      }
      student_checkins: {
        Row: {
          class_id: string | null
          comment: string | null
          date: string
          happiness_score: number
          id: string
          student_id: string | null
        }
        Insert: {
          class_id?: string | null
          comment?: string | null
          date?: string
          happiness_score: number
          id?: string
          student_id?: string | null
        }
        Update: {
          class_id?: string | null
          comment?: string | null
          date?: string
          happiness_score?: number
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_checkins_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_checkins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_verifications: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          lesson_plan_id: string
          student_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          lesson_plan_id: string
          student_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          lesson_plan_id?: string
          student_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_verifications_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_lesson_verifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          grade_id: string | null
          id: string
          is_compulsory: boolean | null
          name: string
          total_hours_per_year: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          grade_id?: string | null
          id?: string
          is_compulsory?: boolean | null
          name: string
          total_hours_per_year?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          grade_id?: string | null
          id?: string
          is_compulsory?: boolean | null
          name?: string
          total_hours_per_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_guidelines: {
        Row: {
          boardwork: string | null
          created_at: string | null
          generated_by_ai: boolean | null
          id: string
          presentation_content: string | null
          reference_links: string | null
          teacher_id: string | null
          teaching_script: string | null
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          boardwork?: string | null
          created_at?: string | null
          generated_by_ai?: boolean | null
          id?: string
          presentation_content?: string | null
          reference_links?: string | null
          teacher_id?: string | null
          teaching_script?: string | null
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          boardwork?: string | null
          created_at?: string | null
          generated_by_ai?: boolean | null
          id?: string
          presentation_content?: string | null
          reference_links?: string | null
          teacher_id?: string | null
          teaching_script?: string | null
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_guidelines_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_guidelines_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_presentations: {
        Row: {
          created_at: string
          guideline_id: string | null
          id: string
          is_published: boolean
          slides_json: Json
          teacher_id: string
          title: string
        }
        Insert: {
          created_at?: string
          guideline_id?: string | null
          id?: string
          is_published?: boolean
          slides_json?: Json
          teacher_id: string
          title: string
        }
        Update: {
          created_at?: string
          guideline_id?: string | null
          id?: string
          is_published?: boolean
          slides_json?: Json
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_presentations_guideline_id_fkey"
            columns: ["guideline_id"]
            isOneToOne: false
            referencedRelation: "teacher_guidelines"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subjects: {
        Row: {
          id: string
          subject_id: string | null
          teacher_id: string | null
        }
        Insert: {
          id?: string
          subject_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          id?: string
          subject_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_guidelines: {
        Row: {
          created_at: string | null
          guideline_text: string
          id: string
          method_type: string | null
          topic_id: string | null
        }
        Insert: {
          created_at?: string | null
          guideline_text: string
          id?: string
          method_type?: string | null
          topic_id?: string | null
        }
        Update: {
          created_at?: string | null
          guideline_text?: string
          id?: string
          method_type?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teaching_guidelines_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          estimated_minutes: number | null
          id: string
          order_index: number | null
          title: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_minutes?: number | null
          id?: string
          order_index?: number | null
          title: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_minutes?: number | null
          id?: string
          order_index?: number | null
          title?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          order_index: number | null
          subject_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number | null
          subject_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number | null
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          approved_by: string | null
          class_id: string | null
          id: string
          interventions_text: string | null
          report_text: string | null
          sent_at: string | null
          status: string
          student_id: string | null
          week_start: string
        }
        Insert: {
          approved_by?: string | null
          class_id?: string | null
          id?: string
          interventions_text?: string | null
          report_text?: string | null
          sent_at?: string | null
          status?: string
          student_id?: string | null
          week_start: string
        }
        Update: {
          approved_by?: string | null
          class_id?: string | null
          id?: string
          interventions_text?: string | null
          report_text?: string | null
          sent_at?: string | null
          status?: string
          student_id?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
    },
  },
} as const
