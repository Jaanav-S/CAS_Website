# CAS Portal

A Creativity, Activity & Service portal for an IB school. Students propose CAS
experiences, write a reflection blog about each one, and track their progress
against the programme requirements. Teachers review the submissions from their
own section. Admins run the whole thing.

Built with Next.js 16 (App Router), MongoDB via Mongoose, and Tailwind CSS.

---

## Deploying

Production runs as Docker containers (app + MongoDB + Caddy for HTTPS), and
every push to `main` auto-deploys via GitHub Actions. Full step-by-step in
[DEPLOY.md](DEPLOY.md).

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
| `GOOGLE_CLIENT_ID`      | yes      | Sign-in is Google-only, so this is required                   |
| `GOOGLE_CLIENT_SECRET`  | yes      | Same                                                          |
| `BOOTSTRAP_ADMIN_EMAIL` | yes      | The one Google address that may sign in without an invite     |
| `GOOGLE_REDIRECT_URI`   | rarely   | Only if your deployed callback URL is not `<origin>/api/auth/google/callback` |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set up Google sign-in

1. Go to <https://console.cloud.google.com/apis/credentials> → **Create
   credentials** → **OAuth client ID** → **Web application**.
2. Add `http://localhost:3000/api/auth/google/callback` as an authorised
   redirect URI (plus your production URL when you deploy).
3. Put the client ID and secret in `.env.local`.

### 5. Run it, and let yourself in

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with the Google account you named in
`BOOTSTRAP_ADMIN_EMAIL`. That is the only account that can get in without an
invitation — everybody else joins through a link you create.

### 6. Set the school up

As the admin:

1. **Sections** → create a section, e.g. `DP1-A` / `2026-27`.
2. **Sign-up links** → create a link per group and send it out (see below).
3. **Sections** → assign the teachers who review each section, if the teacher
   link did not already do it.

---

## How it works

### Roles

| Role                | Can                                                                        |
| ------------------- | -------------------------------------------------------------------------- |
| **Student**         | Propose experiences, write reflections, run CAS projects, track their own progress, read Discovery |
| **Teacher**         | See their section's progress and sign-up links, approve or send back their section's reflections and projects |
| **CAS supervisor**  | A school-wide overview: every student's progress, every reflection, and (still) the second sign-off on any CAS project |
| **CAS coordinator** | Everything an admin can do, except creating coordinator sign-up links or granting the admin/coordinator role; the project sign-off is now theirs |
| **Admin**           | Everything above, plus creating coordinator links and granting the admin/coordinator role |

### CAS coordinator

A **CAS coordinator** has the admin panel and all of its powers, with two
reservations, both enforced server-side:

- they cannot create a sign-up link for another coordinator, and
- they cannot grant (or touch) the admin or coordinator role — only an admin
  can promote someone to coordinator, and coordinators cannot rank themselves
  up.

The **second sign-off on a CAS project** — both the proposal and the completion
round — is the coordinator's job now. A CAS supervisor keeps the right to give
it too; whoever gives it, the slot is labelled *CAS coordinator* (the person's
name is still recorded). Coordinators can also approve reflections and see every
student, like a supervisor.

### Staff search

The admin, coordinator and supervisor overviews carry one keyword box that
searches reflections and CAS projects by title **or by the name of any student
involved** — type a student's name and their work surfaces.

### Signing up

There is no self-signup and no passwords. Sign-in is Google-only, and an
account is created **only** by opening a sign-up link.

**Admin → Sign-up links** creates one. You choose:

- **who is joining** — student, teacher or CAS supervisor,
- **the section** — required for students, optional for teachers, not used for
  supervisors,
- **how many people** will use it.

Send the link to the group. Each person opens it, signs in with Google, and is
created straight away with that role and section, already approved — the link
*is* the approval. **The link stops working the moment that many people have
joined**, and can be turned off early.

Both the admin and the section's teacher can see how many places are left and
exactly who has joined; the admin's overview and the class overview each carry a
"still to sign up" figure.

Signing in with a Google account that has no account and no invite is refused
with an explanation. Someone who already has an account just signs in — an
invite is never spent on them.

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

Discovery carries two kinds of thing: approved **reflections** and finished,
doubly-signed-off **CAS projects**. Filter by **kind** (reflections / projects /
everything), **section**, **student** and **DP year**. The filters combine and
live in the query string, so a filtered view can be linked to. Only values that
actually have something published behind them appear in the dropdowns.

A project card is covered by its earliest timeline photo and credits every
member; filtering by student finds a project if that student is on it, not only
if they created it.

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

### CAS projects

A CAS project is the collaborative one, and it is kept separate from ordinary
experiences: it lives under **My CAS → CAS projects**.

**Who is on it.** The student who starts it adds up to six others by email.
Each address is checked as it is typed and again on save — it has to belong to a
registered, admin-approved, not-yet-graduated *student* account. Everyone on the
project can read and edit it; only the creator can change the member list.

**The form** covers project members, title, focus, anticipated dates, CAS
supervisor, strands, the four CAS stages (investigation, preparation/planning,
action, reflection), budget, donation organisation and its contact, external
supervisor, risk assessment and precautions, and links to a planning doc and a
participation form.

**Two approvals.** A submitted project goes to the section teacher *and* a CAS
supervisor at the same time. Both must approve. Either one rejecting sends the
whole project back with a reason, and resubmitting resets both sign-offs.

**The timeline** unlocks only once both approvals are in. Every entry needs a
date, a description and a photo — all three. Any member can add entries and
remove their own; the teacher and CAS supervisor can read the timeline but not
edit it.

**Finishing.** When the students are done, any member hits *Mark project as
done* (it needs at least one timeline entry). That opens a **second, separate**
approval round with the same two people, and the project and its timeline lock
while they look.

The resubmission rule differs from the first round on purpose:

|                          | To start                        | To finish                                   |
| ------------------------ | ------------------------------- | ------------------------------------------- |
| One approver rejects     | whole project sent back          | whole project sent back                      |
| On resubmission          | **both** approvals start over    | **only the rejecter** is asked again         |

So if the supervisor has already signed off and the teacher asks for changes,
the supervisor's yes stands — the students fix what the teacher said and it
goes back to the teacher alone. The page tells them exactly that.

Once both sign off, the project is **published to Discovery** for the whole
school, and it freezes: no more edits, no more timeline entries.

**Contacting the students.** On a project, staff get shortcuts to Google
Calendar (prefilled with every member as a guest) and Gmail (addressed to all of
them). The Chat button opens Google Chat — Google publishes no link that opens a
direct message with a given email address, so it lands on the conversation list
rather than on that person.

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
      projects/       CAS projects: the form, the detail view and the timeline
      teacher/        class overview, review queue, student records, projects
      supervisor/     CAS supervisor overview and project approvals
      admin/          stats, users, sections, projects
    api/              route handlers (auth, experiences, uploads, admin)
    login, signup, pending
  components/         shared UI (form controls, cards, blog rendering)
  lib/                auth, db, validation, progress, queries
  models/             Mongoose schemas: User, Section, Experience, CasProject
  proxy.ts            redirects signed-out visitors to /login
scripts/              one-off migrations
uploads/              runtime image uploads (gitignored)
```

### Maintainer access

There is an owner/maintainer tier above admin, for support and break-glass. It
is granted by the `MAINTAINER_KEYS` environment variable (see
[`src/lib/auth.ts`](src/lib/auth.ts)); it is never written to the database and
never appears in the UI.

The value is a list of **keyed hashes of the maintainer's email, not the email
itself** — an HMAC-SHA256 keyed with `AUTH_SECRET`. So even someone with access
to the environment cannot tell whose account it is, and cannot forge an entry
without the secret. Generate the digest for an address with:

```bash
node -e "console.log(require('crypto').createHmac('sha256', process.env.AUTH_SECRET).update('you@example.com').digest('hex'))"
```

Run it with your real `AUTH_SECRET` set, paste the hex string into
`MAINTAINER_KEYS`, and sign in with that Google account. It works identically on
the live site (set the variable in your hosting dashboard). Regenerate the
digests if you rotate `AUTH_SECRET`.

This is deliberately a keyed-secret mechanism, not an auth bypass hidden inside
the code. A bypass concealed from code review would be a security hole in its
own right; storing only a keyed hash gives the same practical result — invisible
to users, and now unreadable even to whoever can see the environment — without
that risk.

### Theme

The palette lives entirely in CSS custom properties at the top of
[`src/app/globals.css`](src/app/globals.css) — forest green on warm ivory, with
amber, slate and brick as the supporting colours.

It is **light only, on purpose**: `color-scheme: light` is declared and there is
no `prefers-color-scheme` block, so a student whose laptop is in dark mode still
gets the same light portal (and light native form controls). A dark UI reads as
a developer tool rather than a school.

Headings use Source Serif 4, self-hosted by `next/font` at build time so the
school network never fetches it at runtime, with Georgia as the fallback. Small
uppercase eyebrow labels deliberately stay in the sans face — the CSS targets
`h2:not(.uppercase)`.

**To rebrand**, change `--brand`, `--brand-strong` and `--brand-soft` in that
one block; everything else follows. The school name is `SCHOOL_NAME` in
[`src/lib/constants.ts`](src/lib/constants.ts).

Contrast was checked against WCAG AA: body text 15.8:1 on cards, muted text
5.4:1, white on the brand button 9.2:1, and every badge pairing at or above
4.5:1.

### Notes on a few decisions

- **Sessions** are a signed JWT in an httpOnly cookie. The cookie holds only a
  user id; the role and approval status are read fresh from Mongo on every
  request, so an admin's change takes effect immediately.
- **Uploaded images** are stored in `uploads/` — outside `public/` — and served
  by `/api/uploads/[name]`, which requires a signed-in, approved account. Stored
  filenames are generated UUIDs, so a crafted upload name cannot escape the
  directory.
- **Models are re-compiled on hot reload in development.** Mongoose caches
  compiled models on its singleton and `next dev` reloads modules without
  restarting the process, so editing a schema — adding a role to an enum, say —
  would otherwise keep validating against the *old* schema until the server was
  restarted, with a baffling "not a valid enum value" error. `registerModel()`
  in [`src/lib/db.ts`](src/lib/db.ts) drops the cached model first in
  development, and reuses it untouched in production.
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
