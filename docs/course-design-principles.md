# Course Design Principles

This document defines the instructional quality contract for generated courses. It is a design standard for the planned proof of concept, not a claim that generated material is already expert-reviewed or validated.

## 1. Define Quality by Evidence

"Professor-level" describes the quality of the teaching, not the difficulty of every lesson. A strong course should demonstrate:

- **Accuracy:** explanations, notation, examples, and qualifications are correct.
- **Coherence:** each topic follows its prerequisites and prepares for later work.
- **Teachability:** explanations anticipate likely misconceptions and show reasoning.
- **Appropriate rigor:** intuitive explanations simplify without distorting the formal idea.
- **Assessment alignment:** exercises measure stated learning outcomes and taught content.
- **Intellectual honesty:** assumptions, uncertainty, interpretation, and evidence limits are explicit.
- **Transfer:** students can use ideas in new but relevant situations.

Polished prose or confident tone is not evidence that these criteria have been met.

## 2. Design the Course Backward

Turn the user's topic into an explicit course specification before drafting lecture notes. Use sensible defaults rather than asking the user to fill in every instructional detail, and show important assumptions for review.

The specification should record:

- Topic scope, intended audience, and assumed prerequisites.
- Measurable learning outcomes using actions such as explain, derive, compare, analyze, or apply.
- A twelve-lecture syllabus and the concepts each lecture introduces.
- Prerequisite relationships between concepts and lectures.
- An assessment blueprint that maps questions to outcomes and taught material.
- Known scope limits and unresolved assumptions.

Generate the coherent course map even when test mode is selected. Test mode generates one lecture's full content, not twelve partial lectures; this allows the pilot lesson to remain anchored in the intended course progression.

Schedule a midterm after Lecture 6 and a cumulative final after Lecture 12. Do not assess a concept before the course has taught it or identified it as an explicit prerequisite.

## 3. Use a Layered Lecture Structure

Each lecture should have a consistent instructional spine while allowing examples and methods to fit the discipline:

1. A motivating problem or question.
2. Measurable learning objectives.
3. A prerequisite check, with a short bridge explanation when useful.
4. An intuitive explanation before or alongside formal definitions.
5. Formal development, notation, evidence, or disciplinary method.
6. Worked examples that expose intermediate reasoning.
7. Real-world or disciplinary applications.
8. Common misconceptions and how to diagnose them.
9. An optional extension for students ready for greater depth.
10. A concise summary connecting this lecture to earlier and later ideas.
11. A self-paced assignment with hints and a worked solution or response rubric.

Layer support rather than flattening the material to one level: a clear core explanation, scaffolding and worked steps, and optional extension material. Teach the prerequisite algebra or method needed for the assigned work.

For a self-contained university lesson, target **5,000–8,000 words of lecture notes**, excluding the self-paced assignment, hints, worked solution, and rubric. Treat this as a content budget rather than a quota: allocate words by section, generate from the approved outline in bounded sections, and use a limited expansion pass for gaps. Do not add repetition or filler to reach the range. Give worked examples enough space to show intermediate reasoning, and keep optional depth clearly separated from the core explanation.

Store generated prose as Markdown in structured course fields. Use Markdown headings, paragraphs, lists, tables, and code blocks where they improve clarity; never generate executable HTML. Render Markdown through the application's trusted components so lists and other structures behave consistently in the reader and exported documents.

Use analogies selectively. State what maps to what, what the analogy helps explain, and where it stops being accurate. An analogy supports the formal explanation; it does not replace it.

## 4. Align Assessments to Learning

For each assessment item, record its learning outcome, topic, intended difficulty, expected answer or reasoning criteria, and feedback. Self-paced exercises should provide progressive hints and revealable solutions; typed responses are not automatically graded unless a separate, reliable grading feature is designed.

Across a lecture assignment, use an appropriate mix of:

- Concept explanation.
- Routine application.
- Transfer to a new example.
- Error analysis.
- Optional extension.

For exams, check prior coverage, outcome weighting, difficulty balance, and plausible completion time. Prefer deterministic checks for STEM calculations where they are available, and state what those checks do not prove. A numerical spot check is not a proof of a general result.

## 5. Ground Claims and Represent Uncertainty

Do not invent citations, quotations, source metadata, or claims of source support. When verified sources are available, retain source identifiers and relevant locations with the claims they support. When sources are not available, identify the generated material as a draft and surface claims needing review instead of fabricating a bibliography.

For emerging or future-facing topics, distinguish established applications, demonstrated research results, proposed uses, and speculation. For interpretive disciplines, distinguish factual claims from interpretations, connect readings to evidence, and allow different conclusions when their arguments are well supported.

## 6. Separate Generation, Validation, and Presentation

Use a controlled sequence rather than asking one prompt to write an entire course website:

1. Normalize the user's request and record assumptions.
2. Create the course specification, syllabus, prerequisite map, and assessment blueprint.
3. Validate required course structure and obtain review of the plan.
4. Draft a lecture against the approved course context and any verified sources.
5. Generate aligned self-paced work, hints, solutions, and rubrics.
6. Check structure, course consistency, factual support, teaching quality, and domain-specific correctness.
7. Request a targeted revision for identified defects, with a bounded retry count; flag unresolved issues for human review.
8. Render validated content through the website's trusted React components.

These are logical responsibilities, not a requirement for separate model vendors or autonomous agents. The planned implementation uses the local Python API to control the stages; n8n may orchestrate those stages later, but is not a dependency of the current stack.

Keep generated course and lecture content structured and separate from HTML, CSS, and JavaScript. Do not ask the model to generate executable website markup. Interactive visualizations should use deterministic application code and clearly state their assumptions.

Structural schema validation can establish that required fields exist; it cannot establish that the mathematics is correct or that a lesson teaches well. Mark generated content as a draft until its review status is explicit, and never describe model agreement as proof.

## 7. Calculus 101 Pilot Checks

Use these as fixed review cases for the first lesson on functions and average rates of change:

| Check | Expected result |
|-------|-----------------|
| Real domain of $f(x)=\sqrt{9-x^2}$ | $[-3,3]$ |
| Range of $f(x)=\sqrt{9-x^2}$ | $[0,3]$ |
| Average rate of $f(x)=x^2$ on $[1,3]$ | $4$ |
| Average of endpoint outputs $f(1)$ and $f(3)$ | $5$, a different quantity from the rate |
| Average velocity for $s(t)=20-3t$ | $-3$ metres per second; do not call negative velocity negative speed |
| Expansion of $(a+h)^2$ | $a^2+2ah+h^2$ |
| Difference quotient for $f(x)=x^2$ at $x=1$ | $2+h$ for $h\ne0$; the original quotient is undefined at $h=0$ |

Also verify that every assessed method has been taught, graph scales are not misleading, formulas render, and hints do not give away the full solution prematurely.

## 8. Review Boundary

Automated structure checks and model review are drafting aids. Before course material is presented as instructionally ready, a qualified reviewer should check domain correctness, source support, accessibility, assessment fairness, and suitability for the intended students. Laboratory procedures require appropriate institutional safety review; a generated explanation is not authorization to perform an experiment.