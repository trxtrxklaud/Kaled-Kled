-- STEP 2: ROW LEVEL SECURITY (RLS)

-- 1. Enable RLS on core tables
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 2. Teacher Policies
-- Teacher sees only their assigned classes:
CREATE POLICY "teacher_own_classes_select" ON grades FOR SELECT
USING (class_id IN (
  SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
));

-- Teacher can only INSERT/UPDATE grades for their classes:
CREATE POLICY "teacher_own_classes_insert" ON grades FOR INSERT
WITH CHECK (class_id IN (
  SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
));
CREATE POLICY "teacher_own_classes_update" ON grades FOR UPDATE
USING (class_id IN (
  SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
));

-- Teacher Attendance Policies
CREATE POLICY "teacher_own_attendance_select" ON attendance FOR SELECT
USING (class_id IN (
  SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
));
CREATE POLICY "teacher_own_attendance_insert" ON attendance FOR INSERT
WITH CHECK (class_id IN (
  SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
));
CREATE POLICY "teacher_own_attendance_update" ON attendance FOR UPDATE
USING (class_id IN (
  SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
));

-- Teacher Homework Policies
CREATE POLICY "teacher_own_homework_select" ON homework FOR SELECT
USING (class_id IN (
  SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
));
CREATE POLICY "teacher_own_homework_insert" ON homework FOR INSERT
WITH CHECK (class_id IN (
  SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
));

-- 3. Parent Policies
-- Parent sees only their children's grades:
CREATE POLICY "parent_own_children_select_grades" ON grades FOR SELECT
USING (student_id IN (
  SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
));

-- Parent sees only their children's attendance:
CREATE POLICY "parent_own_children_select_attendance" ON attendance FOR SELECT
USING (student_id IN (
  SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
));

-- Parent sees only their children's homework (assuming homework has class_id, we need to join through students table if direct student_id is missing, but assuming standard access here):
-- If homework is per class:
CREATE POLICY "parent_own_children_select_homework" ON homework FOR SELECT
USING (class_id IN (
  SELECT class_id FROM students WHERE id IN (
    SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
  )
));

-- Parent sees only their children's schedules:
CREATE POLICY "parent_own_children_select_schedules" ON schedules FOR SELECT
USING (class_id IN (
  SELECT class_id FROM students WHERE id IN (
    SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
  )
));

-- Parent sees only their children's payments:
CREATE POLICY "parent_own_children_select_payments" ON payments FOR SELECT
USING (student_id IN (
  SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
));

-- 4. Admin Policies (Bypass RLS)
ALTER TABLE grades FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_grades" ON grades FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');

ALTER TABLE attendance FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_attendance" ON attendance FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');

ALTER TABLE homework FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_homework" ON homework FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');

ALTER TABLE schedules FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_schedules" ON schedules FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');

ALTER TABLE payments FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_payments" ON payments FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');
