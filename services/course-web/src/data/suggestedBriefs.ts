import type { SuggestedCourseBrief } from '../types/course';

export const suggestedBriefs: SuggestedCourseBrief[] = [
  {
    title: 'Linear Algebra',
    courseCode: 'MATH 221',
    description: 'A starter brief around vector spaces, matrices, transformations, and eigenvalues.',
    kind: 'suggested',
    generationLabel: '12 lectures by default',
    learningOutcomes: [
      'Solve linear systems and interpret their solution sets geometrically.',
      'Compare linear transformations using matrix representations.',
      'Explain eigenvalues and eigenvectors in applied and abstract settings.',
    ],
  },
  {
    title: 'Discrete Mathematics',
    courseCode: 'CS 210',
    description: 'A starter brief for logic, proof techniques, graph theory, and counting.',
    kind: 'suggested',
    generationLabel: '12 lectures by default',
    learningOutcomes: [
      'Construct direct, contrapositive, and contradiction proofs.',
      'Model finite structures with graphs and relations.',
      'Apply counting principles and recurrence relations to discrete problems.',
    ],
  },
];