# SkillSync Foundation Scaffold — Remaining Steps

The Next.js 14 project is initialized and verified. This plan covers the remaining scaffold work: installing dependencies, setting up shadcn/ui, creating folder structure, placeholder pages, layout, env template, and gitignore.

## Proposed Changes

### Step 2: Install Foundational Dependencies

You'll need to run these commands in your terminal:

```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Inngest
npm install inngest

# Forms & validation
npm install react-hook-form zod @hookform/resolvers

# Animation
npm install framer-motion
```

Or all at once:

```bash
npm install @supabase/supabase-js @supabase/ssr inngest react-hook-form zod @hookform/resolvers framer-motion
```

> [!IMPORTANT]
> No Supabase/Inngest functionality will be implemented — just installing the packages.

---

### Step 3: Initialize shadcn/ui

You'll run:

```bash
npx shadcn@latest init
```

When prompted, choose:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

Then install the required components:

```bash
npx shadcn@latest add button input form card dialog dropdown-menu avatar badge table tabs select sonner
```

> [!NOTE]
> shadcn/ui will create a `components/ui/` folder and a `lib/utils.js` file automatically. It may also install `tailwind-merge`, `clsx`, `class-variance-authority`, and `lucide-react` as dependencies.

---

### Step 4: Create Folder Structure

I'll create these directories (with `.gitkeep` files to preserve empty folders):

```
/app/(auth)/login/
/app/(auth)/signup/
/app/(auth)/onboarding/
/app/(dashboard)/student/
/app/(dashboard)/industry/
/app/(dashboard)/academician/
/app/(dashboard)/institution/
/app/api/webhooks/

/components/ui/          ← already created by shadcn
/components/forms/
/components/dashboard/
/components/shared/

/lib/supabase/
/lib/inngest/functions/
/lib/ai/prompts/
/lib/validators/
/lib/utils/              ← note: lib/utils.js already exists from shadcn

/supabase/migrations/

/hooks/
```

> [!NOTE]
> No `/types` directory since we're using JavaScript. No feature-specific folders (assessment, opportunities, etc.).

---

### Step 5: Create Minimal Placeholder Pages

Each page will be a simple `.js` file with just a heading:

| File | Heading |
|------|---------|
| `app/page.js` | Update existing to show "SkillSync — Home" |
| `app/(auth)/login/page.js` | "Login" |
| `app/(auth)/signup/page.js` | "Sign Up" |
| `app/(auth)/onboarding/page.js` | "Onboarding" |
| `app/(dashboard)/student/page.js` | "Student Dashboard" |
| `app/(dashboard)/industry/page.js` | "Industry Dashboard" |
| `app/(dashboard)/academician/page.js` | "Academician Dashboard" |
| `app/(dashboard)/institution/page.js` | "Institution Dashboard" |

No login/signup logic, no auth, no DB queries, no redirects.

---

### Step 6: Basic Global Layout

Update `/app/layout.js` to:
- Set metadata: `title: "SkillSync"`, `description: "Academia-Industry Collaboration Portal"`
- Load Tailwind/global CSS (already done)
- Render `{children}`
- Keep the Geist fonts

No navbar or dashboard layout yet.

---

### Step 7: Environment Variable Template

#### [NEW] `.env.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

No fake credentials.

---

### Step 8: Git/Project Hygiene

#### [MODIFY] `.gitignore`

Add these entries:
```
.env
.env.local
.env.*.local
```

---

### Step 9: Create Middleware Placeholder

#### [NEW] `middleware.js`

Empty middleware file — no auth protection logic yet.

---

## Verification Plan

### Automated Tests
```bash
npm run build
```

### Manual Verification
- Confirm all routes render:
  - `/` → "SkillSync — Home"
  - `/login` → "Login"
  - `/signup` → "Sign Up"
  - `/onboarding` → "Onboarding"
  - `/student` → "Student Dashboard"
  - `/industry` → "Industry Dashboard"
  - `/academician` → "Academician Dashboard"
  - `/institution` → "Institution Dashboard"

## Open Questions

> [!IMPORTANT]
> **Dashboard routes**: Your original prompt had routes like `/dashboard/student`, but with route groups `(dashboard)`, the actual URL will be `/student` (not `/dashboard/student`). If you want `/dashboard/student` as the URL, the structure should be `/app/dashboard/student/` (without parentheses). Which do you prefer?
>
> - **Option A**: `/student`, `/industry`, etc. (using route group `(dashboard)`)
> - **Option B**: `/dashboard/student`, `/dashboard/industry`, etc. (using a real `dashboard` folder)
