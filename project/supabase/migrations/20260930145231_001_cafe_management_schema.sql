/*
# Quản lý quán cà phê — Schema đầy đủ

1. Bảng mới
- `profiles`: thông tin nhân viên, liên kết auth.users, có role (admin/staff)
- `categories`: nhóm menu (cà phê, trà, đá xay, billiard...)
- `menu_items`: món uống / dịch vụ, giá, loại, trạng thái bán
- `tables`: bàn (thường / billiard), trạng thái, đơn giá giờ
- `members`: thành viên tích điểm theo SĐT, cấp bậc
- `shifts`: ca làm việc, doanh thu ca
- `orders`: đơn hàng theo bàn, tính tiền nước + giờ, giảm giá, phương thức thanh toán
- `order_items`: chi tiết món trong đơn

2. Bảo mật
- RLS bật trên mọi bảng.
- Policy `TO authenticated USING (true)` cho SELECT/INSERT/UPDATE/DELETE.
- Chỉ người đã đăng nhập mới truy cập được dữ liệu.

3. Ghi chú
- Bàn billiard có `hourly_rate` để tính tiền giờ theo thời gian thực.
- Đơn hàng có `time_started` / `time_ended` để tính tiền giờ.
- Thành viên có `points` và `total_spent` để tự động xếp hạng.
*/

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  display_name text NOT NULL DEFAULT 'Nhân viên',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_profiles" ON profiles;
CREATE POLICY "auth_select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_profiles" ON profiles;
CREATE POLICY "auth_insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_profiles" ON profiles;
CREATE POLICY "auth_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_profiles" ON profiles;
CREATE POLICY "auth_delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (true);

-- ============ categories ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_categories" ON categories;
CREATE POLICY "auth_select_categories" ON categories FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_categories" ON categories;
CREATE POLICY "auth_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_categories" ON categories;
CREATE POLICY "auth_update_categories" ON categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_categories" ON categories;
CREATE POLICY "auth_delete_categories" ON categories FOR DELETE
  TO authenticated USING (true);

-- ============ menu_items ============
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  price numeric(12,0) NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'drink' CHECK (type IN ('drink', 'billiard')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_menu_items" ON menu_items;
CREATE POLICY "auth_select_menu_items" ON menu_items FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_menu_items" ON menu_items;
CREATE POLICY "auth_insert_menu_items" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_menu_items" ON menu_items;
CREATE POLICY "auth_update_menu_items" ON menu_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_menu_items" ON menu_items;
CREATE POLICY "auth_delete_menu_items" ON menu_items FOR DELETE
  TO authenticated USING (true);

-- ============ tables ============
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'normal' CHECK (type IN ('normal', 'billiard')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
  hourly_rate numeric(12,0) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_tables" ON tables;
CREATE POLICY "auth_select_tables" ON tables FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_tables" ON tables;
CREATE POLICY "auth_insert_tables" ON tables FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_tables" ON tables;
CREATE POLICY "auth_update_tables" ON tables FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_tables" ON tables;
CREATE POLICY "auth_delete_tables" ON tables FOR DELETE
  TO authenticated USING (true);

-- ============ members ============
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  points int NOT NULL DEFAULT 0,
  total_spent numeric(12,0) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_members" ON members;
CREATE POLICY "auth_select_members" ON members FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_members" ON members;
CREATE POLICY "auth_insert_members" ON members FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_members" ON members;
CREATE POLICY "auth_update_members" ON members FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_members" ON members;
CREATE POLICY "auth_delete_members" ON members FOR DELETE
  TO authenticated USING (true);

-- ============ shifts ============
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by text NOT NULL DEFAULT '',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_by text,
  closed_at timestamptz,
  opening_cash numeric(12,0) NOT NULL DEFAULT 0,
  closing_cash numeric(12,0) NOT NULL DEFAULT 0,
  total_revenue numeric(12,0) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_shifts" ON shifts;
CREATE POLICY "auth_select_shifts" ON shifts FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_shifts" ON shifts;
CREATE POLICY "auth_insert_shifts" ON shifts FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_shifts" ON shifts;
CREATE POLICY "auth_update_shifts" ON shifts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_shifts" ON shifts;
CREATE POLICY "auth_delete_shifts" ON shifts FOR DELETE
  TO authenticated USING (true);

-- ============ orders ============
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES tables(id) ON DELETE SET NULL,
  table_name text NOT NULL DEFAULT '',
  table_type text NOT NULL DEFAULT 'normal',
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  staff_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid')),
  items_total numeric(12,0) NOT NULL DEFAULT 0,
  time_total numeric(12,0) NOT NULL DEFAULT 0,
  time_started timestamptz,
  time_ended timestamptz,
  hourly_rate numeric(12,0) NOT NULL DEFAULT 0,
  discount numeric(12,0) NOT NULL DEFAULT 0,
  discount_type text DEFAULT 'amount' CHECK (discount_type IN ('amount', 'percent')),
  final_total numeric(12,0) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'card')),
  points_earned int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_orders" ON orders;
CREATE POLICY "auth_select_orders" ON orders FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_orders" ON orders;
CREATE POLICY "auth_insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_orders" ON orders;
CREATE POLICY "auth_update_orders" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_orders" ON orders;
CREATE POLICY "auth_delete_orders" ON orders FOR DELETE
  TO authenticated USING (true);

-- ============ order_items ============
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  price numeric(12,0) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_order_items" ON order_items;
CREATE POLICY "auth_select_order_items" ON order_items FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_order_items" ON order_items;
CREATE POLICY "auth_insert_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_order_items" ON order_items;
CREATE POLICY "auth_update_order_items" ON order_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_order_items" ON order_items;
CREATE POLICY "auth_delete_order_items" ON order_items FOR DELETE
  TO authenticated USING (true);

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
