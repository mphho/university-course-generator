from app.models.course import Course
from app.models.generation import AssessmentBlueprintItem, ConceptDependency, LecturePlan

CALCULUS_101 = Course.model_validate(
    {
        "id": "calculus-101",
        "title": "Calculus 101",
        "course_code": "MATH 101",
        "level": "Undergraduate",
        "description": (
            "A first course in limits, derivatives, integrals, and mathematical "
            "reasoning."
        ),
        "learner_profile": "First-year students with a working knowledge of algebra and functions.",
        "prerequisites": [
            "Algebraic manipulation",
            "Functions and graphs",
            "Exponent and logarithm rules",
        ],
        "learning_outcomes": [
            (
                "Evaluate limits and explain continuity using graphical, numerical, "
                "and algebraic evidence."
            ),
            "Derive and interpret derivatives as instantaneous rates of change.",
            "Select differentiation techniques and justify their use in applied problems.",
            (
                "Connect definite integrals to accumulated change and apply the "
                "Fundamental Theorem of Calculus."
            ),
        ],
        "units": [
            {
                "id": "unit-1",
                "title": "Limits & continuity",
                "summary": "Build the language of approaching values and continuous change.",
                "lecture_ids": ["lecture-01", "lecture-02", "lecture-03"],
            },
            {
                "id": "unit-2",
                "title": "Differentiation",
                "summary": "Develop derivative rules and use them to model change.",
                "lecture_ids": ["lecture-04", "lecture-05", "lecture-06"],
            },
            {
                "id": "unit-3",
                "title": "Integration",
                "summary": "Move from local rates to total accumulation and area.",
                "lecture_ids": ["lecture-07", "lecture-08", "lecture-09"],
            },
            {
                "id": "unit-4",
                "title": "Synthesis & series",
                "summary": "Connect the course ideas and extend them to sequences and series.",
                "lecture_ids": ["lecture-10", "lecture-11", "lecture-12"],
            },
        ],
        "lectures": [
            {
                "id": "lecture-01",
                "number": 1,
                "title": "Limits and Continuity",
                "duration_minutes": 50,
                "role": "Core",
                "summary": "Estimate and evaluate limits, then test continuity at a point.",
                "objectives": [
                    "Evaluate one-sided and two-sided limits.",
                    "Distinguish a function value from a limiting value.",
                    "Classify and explain common discontinuities.",
                ],
            },
            {
                "id": "lecture-02",
                "number": 2,
                "title": "Derivative as a Function",
                "duration_minutes": 45,
                "role": "Core",
                "summary": "Build the derivative from average rates and the difference quotient.",
                "objectives": [
                    "Interpret average rate of change on an interval.",
                    "Derive a difference quotient from first principles.",
                    "Explain why the derivative is undefined at a corner.",
                ],
            },
            {
                "id": "lecture-03",
                "number": 3,
                "title": "Differentiation Rules",
                "duration_minutes": 55,
                "role": "Practice",
                "summary": (
                    "Choose and combine rules to differentiate algebraic and "
                    "transcendental functions."
                ),
                "objectives": [
                    "Apply product, quotient, and chain rules.",
                    "Differentiate exponential and logarithmic functions.",
                    "Check a derivative by comparing units and behavior.",
                ],
            },
            {
                "id": "lecture-04",
                "number": 4,
                "title": "Applications of Derivatives",
                "duration_minutes": 50,
                "role": "Assessment",
                "summary": (
                    "Use derivatives to analyze motion, marginal change, and local "
                    "behavior."
                ),
                "objectives": [
                    "Relate derivative sign to increasing and decreasing intervals.",
                    "Interpret velocity separately from speed.",
                    "Use a derivative to estimate a nearby function value.",
                ],
            },
            {
                "id": "lecture-05",
                "number": 5,
                "title": "Optimization and Related Rates",
                "duration_minutes": 55,
                "role": "Core",
                "summary": (
                    "Translate constraints into a model before optimizing or "
                    "differentiating with respect to time."
                ),
                "objectives": [
                    "Identify variables and constraints in an applied problem.",
                    "Find and justify candidate extrema.",
                    "Use units to interpret a related rate.",
                ],
            },
            {
                "id": "lecture-06",
                "number": 6,
                "title": "Curve Sketching and the Midterm Review",
                "duration_minutes": 50,
                "role": "Practice",
                "summary": (
                    "Combine first- and second-derivative evidence into a coherent "
                    "graph analysis."
                ),
                "objectives": [
                    "Locate critical points and inflection points.",
                    "Connect concavity with second-derivative evidence.",
                    "Explain the limits of a graph-based conclusion.",
                ],
            },
            {
                "id": "lecture-07",
                "number": 7,
                "title": "Antiderivatives and Accumulation",
                "duration_minutes": 50,
                "role": "Core",
                "summary": (
                    "Read accumulation as a running total and connect it to "
                    "antiderivatives."
                ),
                "objectives": [
                    "Find basic antiderivatives.",
                    "Interpret a definite integral as signed accumulation.",
                    "Approximate accumulated change with Riemann sums.",
                ],
            },
            {
                "id": "lecture-08",
                "number": 8,
                "title": "The Definite Integral",
                "duration_minutes": 55,
                "role": "Core",
                "summary": (
                    "Define area through limits of sums and reason about integral "
                    "properties."
                ),
                "objectives": [
                    "Set up a Riemann sum for a partition.",
                    "Use integral properties to simplify an expression.",
                    "Distinguish geometric area from signed integral.",
                ],
            },
            {
                "id": "lecture-09",
                "number": 9,
                "title": "The Fundamental Theorem of Calculus",
                "duration_minutes": 55,
                "role": "Core",
                "summary": (
                    "Use the derivative-integral relationship to evaluate "
                    "accumulation efficiently."
                ),
                "objectives": [
                    "State both parts of the Fundamental Theorem.",
                    "Evaluate a definite integral with an antiderivative.",
                    "Differentiate an accumulation function with a variable bound.",
                ],
            },
            {
                "id": "lecture-10",
                "number": 10,
                "title": "Integration Techniques and Substitution",
                "duration_minutes": 50,
                "role": "Practice",
                "summary": (
                    "Recognize inverse-chain-rule structure and choose a useful "
                    "substitution."
                ),
                "objectives": [
                    "Select a substitution that simplifies an integrand.",
                    "Transform bounds for a definite integral.",
                    "Verify an antiderivative by differentiation.",
                ],
            },
            {
                "id": "lecture-11",
                "number": 11,
                "title": "Sequences, Series, and Approximation",
                "duration_minutes": 55,
                "role": "Core",
                "summary": "Use polynomial approximations to describe local behavior and error.",
                "objectives": [
                    "Construct a low-degree Taylor approximation.",
                    "Interpret the approximation near its center.",
                    "Name assumptions behind an error estimate.",
                ],
            },
            {
                "id": "lecture-12",
                "number": 12,
                "title": "Cumulative Applications and Course Synthesis",
                "duration_minutes": 50,
                "role": "Assessment",
                "summary": (
                    "Choose between derivative and integral models and explain the "
                    "connection."
                ),
                "objectives": [
                    "Select a calculus model for a new applied situation.",
                    "Connect a rate model to accumulated change.",
                    "Communicate a result with assumptions and units.",
                ],
            },
        ],
        "assessments": [
            {
                "id": "assignment-01",
                "kind": "assignment",
                "title": "Assignment 01: Limits and Continuity",
                "coverage": "Limits and Continuity",
                "description": (
                    "Five problems on limit laws, one-sided limits, and continuity "
                    "at a point."
                ),
                "status": "Draft",
                "problem_count": 5,
                "points": 20,
                "difficulty": "introductory",
                "rubric": [
                    "Show the limit strategy.",
                    "State domain and continuity assumptions.",
                    "Use clear notation and justify the conclusion.",
                ],
            },
            {
                "id": "assignment-02",
                "kind": "assignment",
                "title": "Assignment 02: Differentiation Rules",
                "coverage": "Differentiation Rules",
                "description": (
                    "Six exercises using product, quotient, and chain rules with "
                    "worked-solution prompts."
                ),
                "status": "Ready",
                "problem_count": 6,
                "points": 24,
                "difficulty": "intermediate",
                "rubric": [
                    "Choose an appropriate rule.",
                    "Show intermediate algebra.",
                    "Check the result with a reasonableness argument.",
                ],
            },
            {
                "id": "midterm-01",
                "kind": "midterm",
                "title": "Midterm I: Limits through Derivatives",
                "coverage": "Limits through Derivatives",
                "description": (
                    "A balanced exam covering limits, continuity, and derivative "
                    "techniques."
                ),
                "status": "Draft",
                "question_count": 12,
                "duration_minutes": 75,
                "sections": [
                    "Limits and continuity",
                    "Derivative meaning",
                    "Differentiation techniques",
                ],
            },
        ],
        "content_review_status": "draft",
    }
)

CALCULUS_101.lecture_plan = [
    LecturePlan(
        id=lecture.id,
        number=lecture.number,
        title=lecture.title,
        duration_minutes=lecture.duration_minutes,
        role=lecture.role,
        summary=lecture.summary,
        objectives=lecture.objectives,
        concepts=[lecture.title],
    )
    for lecture in CALCULUS_101.lectures
]
CALCULUS_101.concept_dependencies = [
    ConceptDependency(
        concept=lecture.title,
        prerequisite_concepts=[CALCULUS_101.lecture_plan[index - 1].title] if index else [],
        lecture_number=lecture.number,
    )
    for index, lecture in enumerate(CALCULUS_101.lecture_plan)
]
CALCULUS_101.assessment_blueprint = [
    AssessmentBlueprintItem(
        kind="assignment",
        title="Assignment 01: Limits and Continuity",
        coverage="Limits and Continuity",
        scheduled_after_lecture=3,
        learning_outcomes=[CALCULUS_101.learning_outcomes[0]],
        question_count=5,
    ),
    AssessmentBlueprintItem(
        kind="assignment",
        title="Assignment 02: Differentiation Rules",
        coverage="Differentiation Rules",
        scheduled_after_lecture=5,
        learning_outcomes=[CALCULUS_101.learning_outcomes[1], CALCULUS_101.learning_outcomes[2]],
        question_count=6,
    ),
    AssessmentBlueprintItem(
        kind="midterm",
        title="Midterm I: Limits through Derivatives",
        coverage="Limits through Derivatives",
        scheduled_after_lecture=6,
        learning_outcomes=CALCULUS_101.learning_outcomes[:3],
        question_count=12,
    ),
    AssessmentBlueprintItem(
        kind="final",
        title="Final Exam",
        coverage="Cumulative course outcomes",
        scheduled_after_lecture=12,
        learning_outcomes=CALCULUS_101.learning_outcomes,
        question_count=18,
    ),
]
