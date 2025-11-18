# Spec Planning
You are given thoughts / ideas that define the users intent for the feature.  Your job is to turn these thoughts and ideas into a Spec Plan (see below)

## Spec Planning
I want to introduce a concept called Spec Planning.  I want you to help me plan out my future specs.  Read spec-driven-dev.md under specs folder.  Typically, I would write these myself.  However, I want to see if you can help me plan the specs. 

## A few guidelines to follow:
1) I don't want you to write detailed specs.  I want the right amount of detail:  The problem with AI writing specs is you go off on tangents.  You make up features I dont want and I spend a lot of time un doing what you made up.  However, at the same time if you don't put any details, then it might be pointless this Spec planning. Lets try to find that just right amount.
2) Follow the Context Engineering best practices (see below)
3) Create mainspec.md and slices that break down the mainspec into manageable chunks 
4) Lets create a temporal plan.  We should know which mainspec comes first and which comes next, so on and so on. Within the mainspec, the slices should be ordered as well.  In both cases (mainspecs and slices) we should have a requirement / specification in the preceding that details important implementation details that would affect the following mainspec or slice.  In other words, knowing the future mainspec / slice what information should I capture to help it out in the “current” mainspec / slice - capturing this as a requirement.

Before we start the Spec planning, I need you to look at my current codebase.  Understand what features are available and which are not.  You can look at my specs folder to understand what specs I have done so far.  However, these specs are not kept up to date, thus you cant trust them and must verify looking at the codebase.  Also, some specs are just placeholders and may not have been fully implemented or not implemented at all. 

I want this Spec planning to be interactive. Ask questions and get feedback regularly. Maybe a good candidate to use AskUserQuestion tool..

## Context Engineering
The biggest lever we have when doing agentic coding is what we choose or don't choose to put in the coding agents context window.  Since we are doing a spec driven approach, our spec is the first input to our coding agent.  Lets follow the following best practices when writing our specs:

1. Reference Authoritative code snippets (from your repo).

Short, idiomatic examples the agent should mimic (patterns, naming, error handling).

2. Type signatures & contracts / Define Interfaces First (even as stubs)

TS interfaces, zod schemas, OpenAPI/Smithy specs, GraphQL SDL.

These constrain shape and remove ambiguity.  We can have an entire slice or partial slice have a task just to define the contracts.

3. “Do / Don’t” counterexamples.

One canonical good example + one bad example with why it’s bad (the negative examples are powerful).

4. Vocabulary & naming glossary (DDD).

Ubiquitous language: “Enrollment, etc. whatever you find in our codebase that seems to be the domain way of saying the concept”

5. “Narrative Spec” – story form

Agents interpret structure better when the spec is narrative:

“A learner visits the course page → clicks ‘Enroll’ → Stripe checkout completes → webhook hits /api/payments/stripe → backend calls /api/enroll → DynamoDB stores enrollment → email confirmation sent.”

This timeline gives a strong temporal signal — clarifies ordering and ownership across layers.

6. Modifying existing use precise file / folder and whats happening today, what should happen tomorrow
Use precise files or folders when possible and explain what is happening today and what should happen after change.  