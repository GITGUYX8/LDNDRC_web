# The Nixmap Pattern: A Teardown of a Map-Shaped Documentation System

Most documentation is a book. It has a table of contents, a beginning, and an end. You are expected to read it in order, or search it when you already know what you are looking for.

[Nixmap](https://vimjoyer.com/nixmap/) is not a book. It is a map.

That sounds like a cosmetic difference until you use it. Nixmap treats learning as navigation: you choose a destination, it computes the prerequisites, and it gives you one small, doable step at a time. The interface is a zoomable concept map, the lessons are short, and almost every page ends with something you can actually run.

I went through the site, its 131 map nodes, its lesson payloads, and its microcopy to pull apart how it works. This is the teardown: the philosophy, the information architecture, the page anatomy, the writing voice, the interaction design, and the parts worth stealing for your own docs.

---

## Prerequisites

You do not need to know Nix to follow this. I will explain the examples as they come up.

It helps if you have:

- read or written technical documentation before,
- used a docs site with a sidebar and a table of contents,
- and wondered why people still ask the same beginner questions anyway.

No installation, no account, and no Nix knowledge required. That is, not coincidentally, the same promise Nixmap makes.

---

## The one-sentence version

> Nixmap turns documentation into a dependency-aware learning environment: every concept is a small node, every goal is a route through its prerequisites, and every page ends with something you can do.

That sentence contains the whole design. The rest of this article unpacks it.

---

## A teardown at a glance

| Layer | What Nixmap does | Pattern name |
|---|---|---|
| Content model | Concepts linked to what they build on | Knowledge graph |
| Navigation | Pick a goal, show only its ancestors | Goal-derived route |
| Lesson unit | One concept, roughly 350 words, one sitting | Atomic lesson |
| Practice | Live REPL, real terminal, simulations | Executable explanation |
| Interface | Map view plus a side sheet | Spatial learning environment |
| Voice | Second person, short sentences, concrete examples | Friendly expert |
| First run | A short dialogue that asks about you | Guided onboarding |
| Trust | Credits, licenses, no signup, no install | Creator-led product |

The interesting part is not any single row. It is that all eight rows agree with each other.

---

## 1. What Nixmap actually is

The site describes itself in one line:

> A map of Nix concepts and the concepts each one builds on.

That is accurate, but it undersells the product. Nixmap is a learning environment with four kinds of content:

1. **Knowledge nodes** — 121 small concept pages, from “Numbers” to “Conditional imports and infinite recursion.”
2. **Simulations** — 8 guided, browser-based projects, such as installing NixOS, turning a configuration into a flake, and packaging a Node.js project.
3. **Dialogue beats** — 2 onboarding sequences where the creator, Yurii (Vimjoyer), talks you through the model.
4. **A map** — 131 nodes connected by 219 prerequisite edges, arranged spatially and color-coded by domain.

The map is not decoration. It is the table of contents, the progress tracker, and the recommendation engine at the same time.

A traditional docs site says: “Here are 300 pages, alphabetized.” Nixmap says: “Here are 131 things you might need, here is how they depend on each other, and here is the shortest path to the thing you actually want.”

That is a different product category.

It is also a product, not a docs generator. It has onboarding, settings, progress, search, feedback, support, and a credits page. Those are product concerns, not documentation concerns. That is why it feels different from a docs site with a nice theme.

---

## 2. The core thesis: knowledge is a graph, learning is a route

Most documentation is organized as a tree: chapters, sections, subsections. A tree is good for reference. It is bad for learning, because the order that makes sense to the author is rarely the order that makes sense to the reader.

Nixmap organizes its content as a directed acyclic graph. Each edge means “this concept is useful before that one.” For example:

- `expressions` comes before `strings`.
- `attribute sets` comes before `configuration.nix`.
- `flakes` comes before `nixos-flake`.
- `sim-install-nixos` comes before `sim-configure-nixos`.

When you choose a goal, Nixmap does not show you the whole graph. It computes the goal’s ancestors and keeps only those. Everything else disappears.

The onboarding explains it better than I can:

> “You pick a goal, and it shows you only the steps to get there. Then you go at your own pace.”

And then it demonstrates it:

> “See? Everything else is gone, and only the steps that lead to NixOS are left. Start from the top and go at your own pace.”

This is the single most important design decision on the site.

### Why a route beats a curriculum

A curriculum is written for an imagined average learner. A route is computed for a specific goal.

That difference shows up in the numbers. In the current graph:

- The route to **Install NixOS** has 18 prerequisites, or 19 steps including the goal.
- The route to **Package your project** has 47 prerequisites, or 48 steps.
- The route to **Take your home with you** has 42 prerequisites, or 43 steps.

A single linear course would have to pick one of those lengths and force everyone through it. A graph lets the same content serve all three goals.

It also solves the “where do I start?” problem without writing a “Getting Started” page that nobody reads. You start at the goal.

### The map is also a memory aid

The spatial layout is doing real work. Concepts live in branches:

- language concepts in yellow,
- Nixpkgs in green,
- the store and packaging in blue,
- the Nix CLI in gray,
- NixOS in blue-purple,
- modules in red,
- Home Manager in orange,
- flakes in purple,
- devshells in aqua-green.

After a while, you remember that “overlays” is a green thing near Nixpkgs, and “mkIf” is a red thing near modules. That is spatial memory, and it is something a sidebar cannot give you.

The map is not just pretty. It is a second index.

---

## 3. The philosophy, in eight moves

Nixmap’s design is opinionated. Here are the beliefs I think it is built on, with the evidence for each.

### Move 1: Start from the goal, not the syllabus

The first question is not “what should I teach?” It is “what is the reader trying to do?”

The onboarding literally asks you to pick a goal, then builds the route for you. The rest of the site is organized around that moment.

**Pattern:** goal-derived route.

### Move 2: Teach just in time, not just in case

A traditional reference teaches everything about a topic because you might need it someday. Nixmap teaches the minimum needed for the next step.

The lessons are short. The median lesson is about 350 words of material, code and terminal output included. The 90th percentile is about 685 words. That is not an accident. It is a deliberate limit on how much a single page can ask from you.

**Pattern:** atomic lesson.

### Move 3: One concept per page, one sitting per concept

The page titles are small and specific:

- “Fallbacks with `or`”
- “Checking with `?`”
- “Merging sets with `//`”
- “Extra arguments with `...`”
- “Naming arguments with `@`”

These are not chapter titles. They are the names of things you can learn in a few minutes and then use.

The site rarely uses headings inside a lesson. In the entire corpus, there are only 76 `<h2>` headings, and all 76 of them are the words “Try it.” There is no “Introduction,” “Overview,” “Summary,” or “Further Reading” scaffolding. The page is a conversation, not a report.

**Pattern:** one idea, one page, one action.

### Move 4: Understanding comes from manipulation

Every lesson is built to be touched. Across the 131 lessons, the site contains:

- 214 live Nix REPL blocks,
- 294 terminal transcripts,
- 186 editable code blocks,
- 103 exercises across 78 lessons.

The exercises are not quizzes about definitions. They are small edits with observable consequences:

> “Change the last line to `hello-world.outPath`. That’s where the result will land, before anything is built.”

> “Add `:${port}` right after `localhost`, inside the quotes, and read the error. Then fix it by changing `port` to `toString port`.”

The reader is not asked to recall. The reader is asked to change something and look at what happens.

**Pattern:** executable explanation.

### Move 5: Errors are teaching material

A lot of docs hide errors. Nixmap puts them in the main flow.

In the derivations lesson, the author removes `> $out` from a build script and shows the real failure:

> “The builder does have to create `$out` itself though. Remove `> $out` from the script, and the build fails, because nothing was left behind. `-L` shows what the builder printed too.”

Then comes the actual terminal output, including the long error message. The error is not a footnote. It is the lesson.

This does two things:

1. It teaches the contract of `$out` better than a definition could.
2. It normalizes failure. The reader learns that errors are part of the workflow, not evidence that they are bad at this.

**Pattern:** error-driven learning.

### Move 6: Meet the learner where they are

The onboarding asks two questions:

- “Have you written code before? Tell me which language you think in. When Nix does something similar, I’ll show you both for comparison.”
- “Given my name, I have to ask. Standard editor shortcuts, or Vim keybindings? No wrong answer.”

Those answers change the experience. The site supports six real comparison languages plus “other” and “none,” and four keymaps: standard, Vim, Emacs, and Helix.

This is a small feature with a large effect. It says: “You are not a blank slate, and I am not going to pretend you are.”

**Pattern:** adaptive examples.

### Move 7: Respect attention

The site is free, requires no account, and installs nothing. The simulations say it explicitly:

> “Everything happens in your browser. Nothing gets installed on your computer.”

Each simulation also gives a time estimate:

> “Takes about 15 minutes.”

And a short “You’ll” list:

- “boot the NixOS installer”
- “go through the installer’s pages: time zone, keyboard, your account, the desktop, unfree software and the disk”
- “let it install, then restart into your new system and log in”

This is respect for the reader’s calendar. It is also good product design: you know what you are committing to before you start.

**Pattern:** explicit contracts.

### Move 8: Confidence through continuity

The simulations form a chain. Each one says what it continues from:

- “Continues from Install NixOS.”
- “Continues from Configure NixOS.”
- “Continues from Turn it into a flake.”

Progress is visible as checkmarks on the map. There is a “Complete” button at the end of each lesson, a “Copy progress link” option, and a “Reset all progress” option. The route card shows “Up next.”

This is not gamification for its own sake. It is a way to make a large, intimidating subject feel like a sequence of finished things.

**Pattern:** visible progress, continuous spine.

### The philosophy in one line

> Nix is notoriously hard to learn. It can do so many things that it’s impossible to know which parts will be useful for you.

Nixmap’s answer is not to teach less. It is to teach the right parts, in the right order, at the right moment.

---

## 4. The information architecture

Here is the shape of the content, as observed from the site.

### The branches

| Branch | Color | Nodes | Examples |
|---|---|---:|---|
| Language | Yellow | 37 | Expressions, strings, lists, functions, laziness |
| Nixpkgs | Green | 9 | `pkgs`, `callPackage`, `override`, overlays |
| Store and packaging | Blue | 26 | Store paths, derivations, `mkDerivation`, build phases |
| Nix CLI | Gray | 9 | `nix repl`, `nix build`, `nix shell`, `nix profile` |
| NixOS | Blue-purple | 16 | `configuration.nix`, `nixos-rebuild`, generations, services |
| Modules | Red | 10 | Options, `imports`, merging, `mkIf`, `mkOption` |
| Home Manager | Orange | 7 | `programs`, `home.file`, Home Manager inside NixOS |
| Flakes | Purple | 9 | Flake references, `follows`, `flake-parts`, Git |
| Devshells | Aqua-green | 6 | `mkShell`, `devShells`, `nix develop`, direnv, devenv |
| Root and beats | Text | 2 | Welcome, Nix |

The colors are not random. They map to domains, and the map’s labels repeat the color, so the encoding is redundant. That matters for accessibility and for memory.

A simplified view of the shape:

```text
welcome
   │
  nix
   ├── language ── expressions ── strings / lists / attribute sets ── functions ── ...
   ├── store ── store paths ── derivations ── mkDerivation ── build phases ── ...
   ├── nixpkgs ── pkgs ── callPackage ── override ── overlays ── ...
   ├── nixos ── configuration.nix ── nixos-rebuild ── generations ── ...
   ├── modules ── options ── imports ── merging ── mkIf ── ...
   ├── flakes ── flake references ── follows ── flake-parts ── ...
   └── home-manager ── programs ── home.file ── ...
```

This is a tree for readability, but the real graph is a DAG. Many edges cross branches: Home Manager depends on modules, NixOS from a flake depends on flakes, and devshells depend on both flakes and Nixpkgs.

### The node types

There are three kinds:

1. **Knowledge nodes** — the atomic concept pages.
2. **Simulation nodes** — the guided projects.
3. **Beat nodes** — the dialogue onboarding.

Only the first two are “content” in the usual sense. The beats are part of the interface.

### The edges

The 219 edges are prerequisites, not categories. They answer the question: “What do I need to understand before this will make sense?”

This is why the graph can generate routes. It is also why the graph is the hard part to maintain. Every new concept needs a careful answer to “what does this depend on?” A wrong edge produces a route that either skips a prerequisite or wastes the reader’s time.

### The route mechanics

When you select a node, you get two actions:

- **Build the route** — show only the ancestors of this node.
- **Open** — open the lesson without changing the map.

Once a route is active, the interface shows:

- “The way to [goal]”
- a progress count,
- an “Up next” card,
- and a “Leave route” control.

The URL can encode a route, and progress can be copied as a link. That makes the route shareable. A teacher can send a student a path, not a table of contents.

### Search

The search palette says: “Search the map, videos and pages.” It supports keyboard navigation with arrow keys and Enter. This is a small thing, but it fits the audience: people who live in a terminal expect search to be fast and keyboard-driven.

### Onboarding

The first-run experience is a ten-beat dialogue with Vimjoyer. It does five things in about two minutes:

1. Welcomes you and names the problem.
2. Explains the map model in one sentence.
3. Asks about your programming background and editor keys.
4. Recommends a first goal and walks you through “Build the route.”
5. Mentions support, without blocking anything.

This is how the site solves the cold-start problem. A 131-node graph is intimidating if you land in the middle of it. A short conversation makes the first move obvious.

---

## 5. The anatomy of a lesson

The lessons look informal, but they follow a repeatable structure. Here is the pattern, using the “Derivations” lesson as the example.

### The template

1. **Hook** — a concrete claim or question.
2. **Scenario** — why the naive approach breaks.
3. **Definition** — the concept, in plain language.
4. **Minimal example** — the smallest code that shows it.
5. **Annotation** — what each line means, in prose.
6. **Variation** — one change, one consequence.
7. **Error** — what happens when it goes wrong.
8. **Generalization** — how the real world uses it.
9. **Try it** — one or two concrete edits with observable results.

Not every lesson uses every step, but the rhythm is consistent.

### The hook

> “Every package in the store was built from a recipe. In Nix, that recipe is called a derivation, and it’s just an attribute set that says what to run, and on which system.”

Notice what this does:

- It starts with something familiar: a recipe.
- It defines the term by its function, not its category.
- It uses “just” to lower the intimidation level.
- It avoids the word “fundamental.”

### The annotation

After the minimal example, the lesson explains each field:

- “`name` ends up in the store path.”
- “`system` says which kind of machine can build it, here a 64-bit Intel or AMD Linux.”
- “`builder` is the program Nix runs, here a shell.”
- “`args` is what the builder gets, so the shell runs `echo hello world > $out` as a script.”

Each sentence is short, concrete, and tied to a line of code. There is no separate “Parameters” table. The explanation lives next to the thing it explains.

### The inline glossary

Terms like `repl`, `store path`, and `derivation` are clickable. Clicking one opens a short definition without leaving the page.

That is just-in-time documentation at the sentence level. The reader does not have to open a new tab, lose their place, and come back. They fill the gap and keep reading.

### The distinction

Then the lesson makes a distinction that most introductions skip:

> “Evaluating this didn’t build anything. Instead, Nix wrote the recipe into the store as a file ending in `.drv`, and that’s the path the repl printed. This step is called instantiation.”

And later:

> “Running the recipe is called realisation.”

This is a good example of teaching the model, not just the commands. The reader learns that there are two phases, and why the `.drv` file exists.

### The error

Then the lesson breaks it on purpose:

> “The builder does have to create `$out` itself though. Remove `> $out` from the script, and the build fails, because nothing was left behind.”

The real error follows. Then the fix is implicit: put `> $out` back. The reader has now seen the contract from both sides.

### The try it

The lesson ends with two exercises:

> “Change the last line to `hello-world.outPath`. That’s where the result will land, before anything is built.”

> “The script is part of the recipe. Change `hello world` in the script to `hello nix`. The name stays the same, but the hash doesn’t, because this is a different package now.”

Each exercise has three properties:

1. **One action.** Change one thing.
2. **One concept.** `outPath`, or the relationship between script and hash.
3. **One observable result.** You can see the path, or the hash, change.

That is the formula. It is much better than “experiment with the configuration.”

### The ending

At the bottom of the sheet, there is a “Complete” button, a “Send feedback” link, and a “goals” control. The lesson does not end with a summary. It ends with a completion.

That is a deliberate choice. Summaries are for reference. Completions are for learning.

---

## 6. The writing tone

This is where Nixmap is most distinctive, and most copyable.

I measured the lesson corpus. These are rough numbers, with code and terminal output included:

- About 50,000 words of lesson material.
- 3,844 sentences.
- Mean sentence length: 13 words.
- Median sentence length: 9 words.
- 634 uses of “you” and 365 uses of “your.”
- 19 uses of “we” and 6 uses of “our.”
- 86 question marks.
- 0 uses of “obviously.”
- 1 use of “basically.”

That last pair is not an accident. The voice is confident without being condescending.

### The voice

It is a knowledgeable friend, not a professor.

- “I” appears mainly in the onboarding, where Vimjoyer is a character.
- “You” is the default for the reader.
- “We” is rare, and when it appears it is a genuine “you and me together,” not a royal “we.”

The tone is warm but not chatty. It does not waste words on “Welcome to this comprehensive guide.” It starts with the thing.

### The openers

The lessons tend to open with one of four moves:

**A question:**

> “Almost all Nix code uses code from somewhere else, usually nixpkgs, the huge collection of packages. But which version of it?”

**A scenario:**

> “Say an update broke your Wi-Fi. On NixOS you just go back to the system you had yesterday, because every system you build is kept as a generation.”

**A contrast:**

> “Here are two scripts that do the same thing. Which one would you trust more?”

**A surprising claim:**

> “Removing something in Nix doesn’t delete it.”

None of them start with “In this section, we will discuss…” That alone puts Nixmap ahead of a lot of documentation.

### The rhythm

Short sentences. One idea each. A concrete noun in almost every sentence.

Here is a typical passage:

> “The simplest way to make one is the built-in `derivation` function. Give it a set, and it gives you a derivation back.”

Two sentences. Eleven words each. Subject, verb, object. No hedging.

Then the explanation deepens:

> “`$out` isn’t Nix. It’s a shell variable, and Nix sets it to the one place in the store the builder is allowed to write to. Whatever the builder leaves there becomes the package, here a single file that says hello world.”

Still short. Still concrete. The abstract idea (“the builder is sandboxed”) is expressed as a physical place (“the one place in the store the builder is allowed to write to”).

### The empathy

The voice occasionally steps out of explanation to acknowledge difficulty:

> “Most flakes live in a Git repository, and that’s where almost everyone trips up once.”

> “Don’t mind the `inputs:` in front of the braces for now. We’ll get to it as soon as there’s something to download.”

These lines do real work. They tell the reader: “This is hard, you are not alone, and it is safe to keep going.” That is the opposite of the “obviously” school of technical writing.

### The comparisons

Because the onboarding asks about your background, the site can show the same idea in a language you already know. The “Compare with” feature covers Python, JavaScript, Rust, Go, Java, and Haskell.

For example, the attribute-set lesson can show a Python dictionary, a JavaScript object, and a Nix attribute set side by side. The reader does not have to translate from scratch. They can anchor the new idea to an old one.

This is a simple idea with a big payoff: it reduces the cost of the first minute.

### The microcopy

The exercise instructions are a masterclass in actionable writing.

Typical docs:

> “Experiment with the expression to observe how `outPath` behaves.”

Nixmap:

> “Change the last line to `hello-world.outPath`. That’s where the result will land, before anything is built.”

Typical docs:

> “Consider modifying the module imports to resolve the issue.”

Nixmap:

> “`ssh.nix` sits next to `configuration.nix`, but nothing imports it yet. Add `./ssh.nix` to the end of the `imports` list.”

The pattern:

1. State the current situation.
2. Name the exact edit.
3. Say what to look for.
4. Stop.

No “try to,” no “explore,” no “you may want to.” Just the action and the observation.

### Before and after

| Typical docs | Nixmap |
|---|---|
| “Derivations are the fundamental build specification mechanism.” | “Every package in the store was built from a recipe.” |
| “This section covers string interpolation.” | “But what if your text has a double quote inside?” |
| “Experiment with the configuration.” | “Change `gpl3Plus` to `mit`.” |
| “Errors may occur if the output path is not created.” | “Remove `> $out` from the script, and the build fails, because nothing was left behind.” |
| “Refer to the official documentation for more information.” | “The error even tells you the fix.” |

The difference is not dumbing down. It is choosing the concrete over the abstract, the next action over the complete taxonomy.

### What not to copy

The voice works because it is backed by real examples and real outputs. If you copy the jokes without the substance, it becomes annoying.

Also, the site can afford to be casual because it is a learning environment, not a reference manual. If you are writing API docs, you still need precise, scannable reference pages. Nixmap itself links out to the official NixOS options search when you need the exhaustive list.

Copy the clarity, not the costume.

---

## 7. The interaction design

Nixmap’s interface is doing more than presenting content. It is modeling the subject.

### The map

The map is a large, zoomable SVG world. Nodes are circles with glyphs. Labels sit underneath. Completed nodes get a checkmark. Hovering or focusing a node reveals its title. Selecting a node opens a side sheet.

The map supports:

- pan and zoom,
- keyboard focus,
- a search palette,
- route highlighting,
- progress badges.

The visual language is consistent: the same colors and labels appear in the map, the search results, and the lesson sheet.

### The sheet

The lesson opens in a sheet on the right, not a new page. The map stays visible. That preserves context: you can see where the lesson sits in the graph while you read it.

The sheet header shows:

- the concept title,
- “The way to [goal]” when a route is active,
- a progress count,
- and an “Up next” card.

This is a small layout decision with a big effect. You never lose the map.

### The Vim status bar

At the bottom of the screen, there is a status bar that looks like Vim:

- `NORMAL` mode tag,
- `credits`,
- `Discord`,
- `support`,
- `1:0` position.

This is more than a joke. It signals the audience: this site is for people who live in a terminal. It also gives the site a place-like feel. You are not reading a blog; you are in an editor.

The status bar is a brand asset. It is memorable, it is functional, and it could not belong to a generic docs template.

### The visual system

The palette is Gruvbox dark: warm charcoal backgrounds, cream text, and saturated accents. The body text is a soft cream (`#fbf1c7`) on a dark brown-gray (`#1d2021`), not pure white on black. That reduces glare and makes long reading sessions easier.

The type is Ubuntu Sans for prose and JetBrains Mono for code. The sans is friendly and slightly rounded; the mono is familiar to developers. The combination says “approachable but technical.”

The components have chunky 2px borders, rounded corners, and a subtle “press” shadow. Buttons look tactile. The map nodes have a soft aura. The overall effect is a warm, hand-built tool, not a corporate docs theme.

The color-coded branches do double duty: they distinguish domains and make the map scannable.

### The onboarding dialogue

The first-run experience is a visual novel, not a modal tour. Vimjoyer appears in different poses (presenting, shrugging, pointing, thinking, thumbs-up, idle) and speaks in short lines. You answer two questions by clicking chips.

This is a smart way to do onboarding because it is:

- **diegetic** — the explanation is part of the world, not a tooltip,
- **short** — ten beats, not a five-step carousel,
- **personal** — the answers change the examples,
- **actionable** — it ends with a real first goal and a real route.

The dialogue also sets the tone. If the first thing you see is a friendly person saying “Nix is notoriously hard to learn,” you relax. The site has already acknowledged the difficulty.

### The simulations

The eight simulations are the most ambitious part of the site. They are browser-based recreations of real workflows:

- install NixOS,
- configure NixOS,
- turn the configuration into a flake,
- put it in Git,
- install Home Manager,
- take your home to an Ubuntu laptop,
- create a devshell,
- package a Node.js project.

Each simulation has:

- a one-line promise,
- a time estimate,
- a “You’ll” checklist,
- a continuity line (“Continues from X”),
- a sandbox disclaimer (“Nothing gets installed on your computer”),
- a “Start simulation” button.

The continuity line is the key. The simulations are not isolated demos. They are a spine. You can start at “Install NixOS” and end at “Package your project,” and each step assumes the previous one.

This is the closest thing the site has to a course, but it is optional. You can ignore the simulations and just read the concepts. The map does not force you down a single path.

### The micro-interactions

Small details reinforce the learning loop:

- The task mark rotates from a target to a checkmark when you solve an exercise.
- The REPL result flashes when it matches the expected output.
- The module-merge widget animates the merged configuration.
- The terminal output changes when you edit a command.
- `prefers-reduced-motion` is respected.

These are not decoration. They are feedback. They tell you, immediately, whether your mental model matches the machine’s.

### The accessibility details

The site has:

- a skip link,
- ARIA labels on nodes,
- keyboard focus on the map,
- semantic headings,
- reduced-motion support,
- redundant color encoding (color plus label plus glyph).

It is not perfect — a map-heavy interface is always a challenge — but the intent is visible.

### The performance pattern

The map shell is server-rendered. Lesson bodies are lazy-loaded from JSON when you open a node. The site also uses speculation rules to prefetch pages at moderate eagerness.

That is the right tradeoff for this product: the map appears quickly, and the heavy lesson content arrives only when you ask for it.

---

## 8. The content system behind it

Nixmap is built with Astro and Solid, with interactive islands for the REPL, terminal, exercises, and simulations. The lesson bodies are JSON payloads fetched on demand. Code highlighting uses tree-sitter grammars compiled to WebAssembly.

You do not need that stack to copy the pattern. But the stack explains some of the behavior:

- **Astro** gives the site a fast, server-rendered shell.
- **Solid islands** make the interactive parts feel native without hydrating the whole page.
- **JSON lesson payloads** keep the initial map light.
- **Tree-sitter** gives accurate highlighting for Nix, Bash, JSON, and YAML.

The architecture follows the interaction model: a persistent map shell, with content streamed into a sheet.

### The licensing choice

The credits page is unusually thorough. It lists:

- the licenses for the site’s software dependencies,
- the licenses for the Nix material,
- the licenses for the NixOS artwork,
- the licenses for the installer and desktop assets.

The content is licensed CC BY-SA 4.0. The website source code is all rights reserved.

That is a deliberate split: share the knowledge, keep the product. It is worth noting because it shows the site takes attribution and reuse seriously. That builds trust, especially in a community that cares about licenses.

---

## 9. Hands-on: rebuild the pattern

Here is a small, runnable version of the core idea. You can use it as a skeleton for your own docs.

### Step 1: model your content as a graph

Create `graph.json`:

```json
{
  "nodes": [
    { "id": "nix", "title": "Nix", "requires": [] },
    { "id": "language", "title": "Language", "requires": ["nix"] },
    { "id": "expressions", "title": "Expressions", "requires": ["language"] },
    { "id": "strings", "title": "Strings", "requires": ["expressions"] },
    { "id": "attribute-sets", "title": "Attribute sets", "requires": ["expressions"] },
    { "id": "configuration", "title": "configuration.nix", "requires": ["attribute-sets", "strings"] },
    { "id": "nixos", "title": "NixOS", "requires": ["configuration"] },
    { "id": "install-nixos", "title": "Install NixOS", "requires": ["nixos"] }
  ]
}
```

The important field is `requires`. It is not a category. It is a claim about what the reader needs first.

### Step 2: compute a route

Save this as `route.py`:

```python
import json
import heapq

def load_graph(path):
    data = json.load(open(path))
    return {n["id"]: n.get("requires", []) for n in data["nodes"]}

def route(graph, goal):
    # 1. Collect the goal and all of its ancestors.
    needed = set()
    stack = [goal]
    while stack:
        node = stack.pop()
        if node in needed:
            continue
        needed.add(node)
        stack.extend(graph.get(node, []))

    # 2. Topologically sort the needed subgraph.
    indegree = {node: 0 for node in needed}
    for node in needed:
        for parent in graph.get(node, []):
            if parent in needed:
                indegree[node] += 1

    queue = [node for node in needed if indegree[node] == 0]
    heapq.heapify(queue)
    order = []

    while queue:
        node = heapq.heappop(queue)
        order.append(node)
        for other in sorted(needed):
            if node in graph.get(other, []):
                indegree[other] -= 1
                if indegree[other] == 0:
                    heapq.heappush(queue, other)

    if len(order) != len(needed):
        raise ValueError("cycle detected in prerequisites")

    return order

if __name__ == "__main__":
    graph = load_graph("graph.json")
    for node in route(graph, "install-nixos"):
        print(node)
```

Run it:

```bash
python3 route.py
```

Expected output:

```text
nix
language
expressions
strings
attribute-sets
configuration
nixos
install-nixos
```

The script sorts siblings alphabetically so the output is stable. Every prerequisite appears before the thing that needs it.

That is the whole “route” feature in about 30 lines. The real Nixmap adds presentation, progress, and a much larger graph, but the core is this simple.

### Step 3: write an atomic lesson

Use this template:

````markdown
# <Concept>

<Hook: a question, a scenario, or a surprising claim.>

<The naive approach, and why it breaks.>

<The concept in one or two sentences.>

```nix
<the smallest example that shows it>
```

<Annotate the example line by line.>

<One variation. What changes, and why.>

<One failure. Show the real error. Explain the contract.>

<Try it: change one thing. Say what to look for.>
````

Keep the whole thing under about 500 words unless the concept genuinely needs more. If it needs more, it is probably two concepts.

### Step 4: make the ending verifiable

Every lesson should end with an action whose result the reader can check.

Bad:

> “Experiment with the different options.”

Good:

> “Change `gpl3Plus` to `mit`. Watch the license field in the output change.”

The reader should not need you to tell them whether they succeeded. The machine should tell them.

### Step 5: add a guided first run

Do not open with a 131-node graph. Open with a short conversation:

1. “What are you trying to do?”
2. “What do you already know?”
3. “Here is the first step. Want me to build the route?”

Then show the route. That is the entire onboarding.

### Step 6: track progress locally

You do not need an account. Store completion in `localStorage`, show a checkmark, and offer a shareable link that encodes the route and the completed nodes.

The Nixmap progress link does exactly this. It is a small feature that makes the site feel like a tool rather than an article.

### A minimum viable version

If you want to test the pattern without rebuilding Nixmap:

| Week | Build |
|---|---|
| 1 | 20 nodes, 5 goals, a static graph, and the route script |
| 2 | 5 atomic lessons with one verifiable exercise each |
| 3 | Progress checkmarks and a shareable route link |
| 4 | One simulation or interactive walkthrough |

That is enough to learn whether the pattern works for your subject.

---

## 10. What I would change, and what to watch out for

Nixmap is impressive, but it is not a universal template. Here are the tradeoffs I would keep in mind.

### The map can overwhelm

A 131-node graph is a lot to land on. The onboarding and the route feature mitigate this, but the first impression is still “where am I?”

If you copy the pattern, make the goal picker the default entry point, not the full map. Let the map be the second view, not the first.

### The graph is expensive to maintain

Every node needs a title, a branch, a position, a glyph, a lesson, and a set of prerequisites. Every edge is a claim that needs to stay true as the content evolves.

The real cost of this pattern is not the frontend. It is the editorial work of keeping the dependency graph honest.

Add a validation step to your build: every `requires` must point to an existing node, and the graph must be acyclic. Nixmap’s graph is a DAG; yours should be too.

### Simulations are expensive

The eight simulations are probably the highest-effort part of the site. They require UI, state, fake filesystems, and careful scripting.

Do not start there. Start with one simulation for your most important goal. If it works, add more.

### Exact-output exercises are brittle

Nixmap checks exercises against expected output. That is powerful, but it can break when versions change, paths differ, or formatting shifts.

Pin your examples to a known version, or use a tolerant matcher that normalizes whitespace and paths. Otherwise your exercises will rot.

### The site is JavaScript-heavy

The map is server-rendered, but the lessons are fetched as JSON and the interactive parts are islands. That is a reasonable tradeoff for this product, but it means you need to think about:

- no-JavaScript fallbacks,
- SEO for lesson content,
- keyboard and screen-reader access,
- performance on low-end devices.

Nixmap does some of this well. It is still a reminder that “interactive docs” and “simple docs” pull in different directions.

### The content is deliberately shallow

Nixmap teaches the model, not the exhaustive API. That is the point. But it means you still need a reference for option names, types, and edge cases.

The right architecture is a hybrid: Nixmap for the learning path, the official options search for the reference. Do not ask one format to do both jobs.

### The voice can be a trap

The casual, second-person voice works because the examples are real and the author knows the subject deeply. If you copy the voice without the substance, it reads as forced.

Copy the principles:

- short sentences,
- concrete examples,
- one idea at a time,
- errors shown honestly,
- the reader treated as capable.

Do not copy the character unless you have a reason.

### Completion is not understanding

Checkmarks are motivating, but they can also encourage clicking “Complete” without doing the exercise. Nixmap’s exercises are the antidote: they require an action, not a scroll.

If you build progress tracking, measure exercise completion and route completion, not just page views.

---

## 11. Nixmap vs. the usual formats

| Approach | Entry point | Structure | Practice | Best for | Weakness |
|---|---|---|---|---|---|
| **Nixmap** | A goal | Dependency graph plus routes | REPL, terminal, simulations | Learning a tool ecosystem | Expensive to build and maintain |
| **Traditional docs** | A table of contents or search | Linear chapters plus reference | Usually none | Looking up facts | Poor at teaching order |
| **Video course** | A playlist | Fixed curriculum | Follow along | Passive introductions | Hard to skim, hard to update |
| **Wiki / forum** | A search box | Fragmented pages | None | Edge cases and community answers | Inconsistent quality |
| **Interactive lab** | A scenario | Fixed exercise | Sandboxed environment | Hands-on practice | Narrow scope, high cost |

Nixmap’s advantage is that it combines the map’s overview, the lesson’s focus, and the exercise’s feedback in one place. Its weakness is that it is a product, not a document. It needs design, engineering, and maintenance.

That is the tradeoff. You are not choosing a docs theme. You are choosing to build a learning environment.

---

## 12. What to steal, in priority order

If you take nothing else from this teardown, take these.

### 1. Add a goal → route view

This is the highest-leverage change. You do not need a map. You need a graph and a route function. Even a simple “What do you want to do?” page that lists prerequisites is a huge improvement over a generic table of contents.

### 2. Make every page end with a verifiable action

One edit. One observation. One check. This turns reading into practice.

### 3. Write the first-run dialogue

Ask two questions:

- What do you already know?
- What are you trying to do?

Then show the first step. That is enough.

### 4. Keep lessons atomic

Aim for one concept, one sitting, roughly 350–500 words. If a page needs a “Part 1” and “Part 2,” it is probably two pages.

### 5. Show real errors

Do not sand off the failure modes. Show the error, explain the contract, and fix it. That is where understanding happens.

### 6. Use the subject’s native interface

Nixmap uses a Vim status bar because its audience lives in Vim. A design tool might use a canvas. A database docs site might use a query console. Let the interface teach the subject.

### 7. Build one simulation

Pick the goal that matters most. Build a safe, browser-based rehearsal of it. Add a time estimate and a “You’ll” list. See if people finish it.

### 8. Protect the voice

Write like a knowledgeable friend. Use short sentences. Prefer the concrete. Treat the reader as capable. Ban “obviously” from your style guide.

---

## 13. The pattern in one page

If you want a summary you can pin above your desk:

- **Model the knowledge as a graph.**
- **Let the reader choose a goal.**
- **Compute the route.**
- **Teach one concept per page.**
- **Show real examples and real errors.**
- **End with a verifiable action.**
- **Track progress, not page views.**
- **Write like a person.**

That is Nixmap in eight lines.

---

## Wrapping up and next steps

Nixmap is worth studying because it takes a hard problem — teaching a famously difficult tool — and solves it with structure rather than volume. The map is the hook, but the real work is in the graph, the atomic lessons, and the voice.

If you want to go further:

1. Open [Nixmap](https://vimjoyer.com/nixmap/) and take the onboarding. Notice how quickly it gets you to a first action.
2. Pick a goal and watch the route appear. Then open one lesson and count the words. Notice how little it asks of you.
3. Read the “Derivations” lesson and look for the error. That is the pattern in miniature.
4. Try the route script above on your own docs. Even a 20-node graph will teach you something about your content.

The big lesson is not “make a map.” It is “respect the reader’s goal, and give them the next step.” The map is just a very good way to do that.

ok
