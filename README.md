# CAS Portal

A Creativity, Activity & Service portal for an IB school. Students propose CAS
experiences, write a reflection blog about each one, and track their progress
against the programme requirements. Teachers review the submissions from their
own section. Admins run the whole thing.

Built with Next.js 16 (App Router), MongoDB via Mongoose, and Tailwind CSS.

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a MongoDB Atlas database

1. Make a free cluster at <https://www.mongodb.com/cloud/atlas>.
2. Create a database user, and allow your IP under **Network Access**.
3. Copy the connection string — it looks like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/cas`.

### 3. Configure the environment

Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

| Variable                | Needed?  | What it is                                                   |
| ----------------------- | -------- | ------------------------------------------------------------ |
| `MONGODB_URI`           | yes      | Your Atlas connection string                                  |
| `AUTH_SECRET`           | yes      | Random 32+ character string used to sign session cookies      |
| `BOOTSTRAP_ADMIN_EMAIL` | yes      | The one account that is auto-approved as an admin on signup   |
| `GOOGLE_CLIENT_ID`      | optional | Enables the "Continue with Google" button                     |
| `GOOGLE_CLIENT_SECRET`  | optional | Same                                                          |
| `GOOGLE_REDIRECT_URI`   | rarely   | Only if your deployed callback URL is not `<origin>/api/auth/google/callback` |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run it

```bash
npm run dev
```

Open <http://localhost:3000>, sign up with the email you put in
`BOOTSTRAP_ADMIN_EMAIL`, and you land as an approved admin. (If you leave that
variable blank, the very first account created becomes the admin instead.)

### 5. Set the school up

As the admin:

1. **Sections** → create a section, e.g. `DP1-A` / `2026-27`.
2. **Users** → as teachers and students sign up, approve them, set their role,
   and put them in a section.
3. **Sections** → assign the teachers who review each section.

Students can only be reviewed by a teacher assigned to their section, so this
step matters.

### Google sign-in (optional)

1. Go to <https://console.cloud.google.com/apis/credentials> → **Create
   credentials** → **OAuth client ID** → **Web application**.
2. Add `http://localhost:3000/api/auth/google/callback` as an authorised
   redirect URI (plus your production URL when you deploy).
3. Put the client ID and secret in `.env.local`.

Google accounts go through the same admin approval as email signups. If someone
signed up with a password and later uses Google with the same email, the two are
linked to one account.

---

## How it works

### Roles

| Role        | Can                                                                        |
| ----------- | -------------------------------------------------------------------------- |
| **Student** | Propose experiences, write reflections, track their own progress, read Discovery |
| **Teacher** | See their section's progress, approve or send back submissions, read Discovery |
| **Admin**   | Approve accounts, set roles, manage sections, see programme-wide stats      |

Everyone signs up as a pending student. Nothing is visible until an admin
approves the account.

### Adding a CAS experience — two steps

**Step 1 — the proposal form.** Year, term, title, description, strands, location,
dates, learning outcomes, SDGs, investigation, learner profile attributes,
supervisor, CAS advisor and the status of the experience.

**Step 2 — the reflection blog.** A header image is **required**; extra images are
optional. The body accepts a small amount of Markdown (`##` headings, `-`
bullets, `>` quotes, `**bold**`, `*italic*`) and is rendered as React elements,
so student text can never inject HTML.

Header images keep whatever shape they were uploaded at — panorama, portrait,
square — and are never cropped. The page caps them at 70% of the viewport
height so a tall photo cannot push the writing off the screen. Uploads must be
at least 200px on each side, no more than 10,000px or 40 megapixels, and under
8 MB. The format is checked by reading the file's own header bytes, so renaming
a `.zip` to `.png` will not get it in.

Saving step 1 creates a draft. Nothing is sent for review until step 2 is
complete and the student hits **Submit for review**.

### Review

Submissions land in the section teacher's queue. Approving publishes the
reflection to **Discovery** and counts it towards the student's progress.
Sending it back **requires a comment** — the student sees it on their dashboard
and on the edit screen, fixes the reflection, and resubmits. Every decision is
kept as a timeline on the experience.

Work that is `pending` or `approved` is locked from editing.

### Taking a post down

A teacher can pull any published reflection from **their own section** off
Discovery; an admin can do it for any section. The control sits on the
Discovery post itself and in the review screen's sidebar.

A takedown needs a reason. It unpublishes the post and hands it back to the
student as "needs changes" — so it stops counting towards their progress until
they fix it and resubmit, at which point re-approving republishes it. The whole
sequence stays on the experience's feedback timeline. Nothing is deleted.

### Autosave

Students never lose a half-written reflection. Every keystroke goes into
`localStorage` immediately, and a debounced write goes to the server about a
second and a half after they stop typing — the header shows *Draft saved at
17:56*, or *Saved locally* before the draft exists on the server.

A dot next to the message shows the state at a glance: **amber and pulsing**
while a save is in flight, **green** once it has landed, **red** if the server
could not be reached. It never shows green for work that is not saved.

- **Tab crashes, browser closes, laptop dies** → reopening the form restores
  what they had, with a banner offering to discard it.
- **Logged out, or on another device** → the server draft has everything from
  the moment step 1 created it.
- **Connection drops** → the local copy still holds; the indicator says so and
  the next successful write syncs it.

Because drafts are saved continuously they are allowed to be incomplete: the
proposal form's rules (title length, at least one strand, and so on) are
enforced when the student submits, not while they type.

### Discovery

Every approved reflection is published to Discovery, filterable by **section**,
**student** and **DP year**. The filters combine and live in the query string,
so a filtered view can be linked to. Only values that actually have posts
behind them appear in the dropdowns.

### DP1 → DP2, and graduating

An account belongs to a person for their whole time at the school, so the thing
that changes as they progress is their **section**, not their identity.

Each section is labelled `DP1` or `DP2`. When an experience is created it takes
a snapshot of the section's DP year, which is why a DP1 reflection stays
labelled DP1 forever, no matter how many times the student is moved afterwards.

Moving a student into a DP2 section (Users → Section) is the promotion:

| What                                     | Where it goes                              |
| ---------------------------------------- | ------------------------------------------ |
| Approved experiences                     | stay with the section they were earned in  |
| Drafts, pending and sent-back work        | follow the student to the new section       |
| Ownership of everything                   | unchanged — always the student              |
| Progress towards the 8                    | counts across both years together           |

So the DP2 teacher reviews everything the student submits from now on and sees
their full record including DP1, while the DP1 teacher keeps their historical
class. A published post can be moderated by either the teacher who was
responsible when it was written or the student's current teacher.

**Graduating.** Users → *Mark graduated*. A graduate keeps their account and can
still sign in, read Discovery and look over their own record, but can no longer
create, edit, submit or upload — the API refuses it and the buttons disappear.
They also drop off their teacher's class overview. It is reversible with
*Un-graduate*.

### Rolling the year over

Sections → **Open promotion panel** does the whole end-of-year move in two
steps, in this order:

1. **Graduate the DP2 batch.** Lists every student currently sitting in a DP2
   section and graduates them in one click, behind a confirmation showing the
   names.
2. **Move DP1 into their DP2 sections.** One picker per DP2 section, listing
   only DP1 students who have not been placed yet — a name vanishes from the
   other pickers as soon as you select it, so nobody can be assigned twice.
   Everything is applied in a single call.

The order matters: promoting first would put the incoming cohort into DP2, where
step 1 would then sweep them up. The panel warns if you go back to step 1 after
promoting, and the API refuses an assignment that lists the same student under
two sections.

Students moved this way follow exactly the same rules as a single move from the
Users page — approved work stays with the class it was earned in, unfinished
work follows the student — because both paths share one function.

### Progress

Progress is computed only from **approved** experiences:

- 8 experiences in total
- at least one in each of Creativity, Activity and Service
- every learning outcome (LO1–LO7) evidenced at least twice

Those numbers live in `REQUIREMENTS` in [`src/lib/constants.ts`](src/lib/constants.ts)
— change them there if your school's thresholds differ, and every dashboard,
class overview and progress ring updates with them.

---

## Project layout

```
src/
  app/
    (app)/            signed-in pages, wrapped in the nav shell
      dashboard/      student home + progress
      my-cas/         a student's own submissions by status
      experiences/    the two-step wizard, view and edit
      discovery/      the approved-reflection feed
      teacher/        class overview, review queue, student records
      admin/          stats, users, sections
    api/              route handlers (auth, experiences, uploads, admin)
    login, signup, pending
  components/         shared UI (form controls, cards, blog rendering)
  lib/                auth, db, validation, progress, queries
  models/             Mongoose schemas: User, Section, Experience
  proxy.ts            redirects signed-out visitors to /login
scripts/              one-off migrations
uploads/              runtime image uploads (gitignored)
```

### Notes on a few decisions

- **Sessions** are a signed JWT in an httpOnly cookie. The cookie holds only a
  user id; the role and approval status are read fresh from Mongo on every
  request, so an admin's change takes effect immediately.
- **Uploaded images** are stored in `uploads/` — outside `public/` — and served
  by `/api/uploads/[name]`, which requires a signed-in, approved account. Stored
  filenames are generated UUIDs, so a crafted upload name cannot escape the
  directory.
- **`proxy.ts`** (Next.js 16's renamed middleware) is only a cheap
  "is there a cookie" gate. Real authorisation happens in every page and route
  handler.

### Deploying

The app runs anywhere Node runs. One caveat: `uploads/` is a local directory, so
on a serverless host (Vercel, Netlify) uploaded images disappear between
deployments. For production there, switch `src/lib/upload.ts` to S3, Cloudinary
or similar and keep the `/api/uploads` route as-is or point image URLs at the
CDN.

---

## Scripts

```bash
node scripts/backfill-dp-year.mjs   # one-off, for databases predating DP years
```

Run that once if your database was created before sections had a DP year: it
labels every unlabelled section `DP1` and stamps existing experiences from
their section. It is safe to run more than once.

```bash
npm run dev     # development server
npm run build   # production build
npm start       # serve the production build
npm run lint    # eslint
```
