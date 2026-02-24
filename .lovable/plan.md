

## Fix Student Roster: Create Student, Verification Status, and Class Level/Section

### Problems Identified

1. **Create Student button**: The `handleCreateStudent` function correctly calls the `create-student` edge function, but the edge function may fail silently. The button label needs renaming to "Create New Student".

2. **Class Level & Section not passed**: The `newClassLevel` and `newSection` state values are sent to the edge function but use empty string which gets converted to `undefined` -- this is actually correct. However, the `useClassStudents` hook joins via `profiles!class_students_student_id_fkey` which may fail if there's no explicit foreign key with that name. This could cause the enrolled student list to be empty.

3. **Pending Verification as separate component**: Instead of showing pending students in a separate section, the user wants all students (verified and unverified) displayed together with their `is_verified` status shown inline.

### Changes

#### 1. `src/hooks/use-supabase-data.ts` - Fix `useClassStudents` hook
- Update the join query to also return `is_verified`, `preferred_class_level`, and `preferred_section` from profiles
- Return these fields so the roster table can display verification status

#### 2. `src/pages/teacher/StudentRoster.tsx` - Major refactor
- **Rename** "Create & Add to Class" button to "Create New Student"
- **Remove** the separate "Pending Verification" section
- **Merge** pending (unverified) students into the main student table with a verification status badge (Verified / Pending)
- **Add** Edit and Verify action buttons inline in the table for each student
- **Show** class level and section columns in the table
- Add a **Verify** button for unverified students directly in the actions column
- Keep the **View** (metrics modal), **Edit**, and **Delete** actions
- Ensure `newClassLevel` and `newSection` are properly passed and reset after creation

#### 3. `supabase/functions/list-pending-students/index.ts` - Keep as-is
- Still needed to fetch unverified students who aren't yet assigned to any class

### Technical Details

- The main table will combine two data sources: enrolled students from `useClassStudents` (with verification status from profiles) + pending unverified students from the edge function
- Each row will show: Name, Class Level, Section, Verified status badge, Mastery, Quizzes, Challenges, Badges, Actions (View/Edit/Verify/Delete)
- The Create Student dialog already has class level and section dropdowns -- just need to ensure the state flows correctly and rename the button

