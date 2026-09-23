import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '../types/course';
import { CourseWorkspacePage } from '../pages/CourseWorkspacePage';

const apiMock = vi.hoisted(() => ({
  getCourse: vi.fn(),
  generateNextLecture: vi.fn(),
  generateAssignment: vi.fn(),
  generateMidterm: vi.fn(),
  generateFinal: vi.fn(),
  importCourse: vi.fn(),
}));
const exportMock = vi.hoisted(() => ({ exportCourse: vi.fn() }));

vi.mock('../api', () => ({ api: apiMock }));
vi.mock('../utils/courseExport', () => ({ exportCourse: exportMock.exportCourse }));

const course = {
  id: 'sample-course',
  title: 'Sample Course',
  courseCode: 'TEST 101',
  level: 'Undergraduate',
  description: 'A test course.',
  learnerProfile: 'New students.',
  prerequisites: [],
  learningOutcomes: [],
  units: [],
  lectures: [{
    id: 'lecture-01',
    number: 1,
    title: 'First Lecture',
    durationMinutes: 50,
    role: 'Core',
    summary: 'A lecture outline summary.',
    objectives: ['Explain the core idea.'],
  }],
  lecturePlan: [],
  assessments: [{
    id: 'assignment-01',
    kind: 'assignment',
    title: 'Assignment 01',
    coverage: 'Introductory material',
    description: 'A starter assignment summary.',
    status: 'Draft',
    problemCount: 2,
    points: 10,
    difficulty: 'introductory',
    rubric: ['Show your reasoning.'],
  }],
  contentReviewStatus: 'draft',
} as Course;

function makeTestModeCourse(): Course {
  return {
    ...course,
    lecturePlan: [
      {
        id: 'lecture-01',
        number: 1,
        title: 'First Lecture',
        durationMinutes: 50,
        role: 'Core',
        summary: 'A lecture outline summary.',
        objectives: ['Explain the core idea.'],
        concepts: ['evidence'],
      },
      {
        id: 'lecture-02',
        number: 2,
        title: 'Second Lecture',
        durationMinutes: 50,
        role: 'Core',
        summary: 'Build on the first lecture.',
        objectives: ['Apply the core idea.'],
        concepts: ['argument'],
      },
    ],
    lectures: [{
      ...course.lectures[0],
      content: {
        motivatingQuestion: 'What makes evidence reliable?',
        prerequisiteCheck: 'Recall how to compare claims with records.',
        intuitiveExplanation: 'Evidence supports a claim when it can be checked.\n\n- Check provenance\n- Seek corroboration',
        formalDevelopment: '## Source check\n\n**Corroboration** compares independent records.',
        workedExamples: [{
          prompt: 'Assess a short historical claim.',
          reasoningSteps: ['Identify its source.', 'Compare independent records.'],
          conclusion: 'The claim is supported within stated limits.',
        }],
        applications: ['Compare competing accounts.'],
        misconceptions: ['A vivid account is not automatically representative.'],
        extension: 'Consider how missing records shape interpretation.',
        summary: 'Evidence supports careful, qualified conclusions.',
        practice: {
          prompt: 'Evaluate a new claim using two sources.',
          learningOutcome: 'Explain the core idea.',
          points: 4,
          hints: ['Check provenance.', 'Look for corroboration.'],
          solution: 'Compare provenance, detail, and independent confirmation.',
          rubric: ['Uses both sources.', 'States a limitation.'],
        },
      },
    }],
  };
}

describe('CourseWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getCourse.mockResolvedValue({ course });
  });

  function renderWorkspace() {
    return render(
      <MemoryRouter initialEntries={['/courses/sample-course']}>
        <Routes>
          <Route path="/courses/:courseId" element={<CourseWorkspacePage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('loads the course from the route and explains when starter lecture notes are absent', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await waitFor(() => expect(apiMock.getCourse).toHaveBeenCalledWith('sample-course'));
    await user.click(await screen.findByRole('button', { name: 'First Lecture' }));

    expect(await screen.findByText(/Outline only · full lecture notes have not been generated/)).toBeInTheDocument();
    expect(screen.getByText('Explain the core idea.')).toBeInTheDocument();
  });

  it('renders generated lecture material in the formatted notes section', async () => {
    const user = userEvent.setup();
    apiMock.getCourse.mockResolvedValue({ course: makeTestModeCourse() });
    renderWorkspace();

    expect(await screen.findByRole('heading', { name: 'Lecture notes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'First Lecture' })).toBeInTheDocument();
    expect(screen.getByText('What makes evidence reliable?')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Source check' })).toBeInTheDocument();
    expect(screen.getByText('Check provenance').closest('li')).toBeInTheDocument();
    expect(screen.getByText('Corroboration').tagName).toBe('STRONG');
    expect(screen.getByText(/words · target 5,000–8,000 · practice excluded/)).toBeInTheDocument();
    expect(screen.getByText('Assess a short historical claim.')).toBeInTheDocument();
    expect(screen.getByText('Compare competing accounts.')).toBeInTheDocument();

    await user.click(screen.getByText('Reveal solution and response rubric'));
    expect(screen.getByText('Compare provenance, detail, and independent confirmation.')).toBeInTheDocument();
  });

  it('generates remaining lecture notes and updates the outline status', async () => {
    const user = userEvent.setup();
    const partialCourse = makeTestModeCourse();
    const completedCourse: Course = {
      ...partialCourse,
      lectures: [
        ...partialCourse.lectures,
        {
          ...partialCourse.lecturePlan![1],
          content: partialCourse.lectures[0].content,
        },
      ],
    };
    apiMock.getCourse.mockResolvedValue({ course: partialCourse });
    apiMock.generateNextLecture.mockResolvedValue({ course: completedCourse });
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: 'Generate remaining lectures (1)' }));

    await waitFor(() => expect(apiMock.generateNextLecture).toHaveBeenCalledWith('sample-course'));
    expect(await screen.findByText('Generated notes for 1 of 1 remaining lectures')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Generate remaining lectures/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Notes ready')).toHaveLength(2);
  });

  it('opens starter assignments and distinguishes summaries from generated prompts', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(await screen.findByRole('tab', { name: /Assignments/ }));
    await user.click(screen.getByRole('button', { name: 'View details' }));

    expect(await screen.findByText('Summary only')).toBeInTheDocument();
    expect(screen.getByText(/no generated prompts or solutions yet/i)).toBeInTheDocument();
  });

  it('generates assignments for a topic in the current course', async () => {
    const user = userEvent.setup();
    apiMock.generateAssignment.mockResolvedValue({ assessment: course.assessments[0] });
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: 'Generate assignment' }));

    await waitFor(() => expect(apiMock.generateAssignment).toHaveBeenCalledWith('sample-course', {
      topic: 'First Lecture',
      difficulty: 'intermediate',
      problemCount: 5,
    }));
  });

  it('exports the complete course in the selected format', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: 'Export DOCX' }));

    expect(exportMock.exportCourse).toHaveBeenCalledWith(course, 'docx');
  });

  it('imports a validated JSON course through the API', async () => {
    const importedCourse = { ...course, id: 'imported-course', title: 'Imported Course' };
    apiMock.importCourse.mockResolvedValue({ course: importedCourse });
    apiMock.getCourse.mockImplementation((courseId: string) => Promise.resolve({
      course: courseId === importedCourse.id ? importedCourse : course,
    }));
    renderWorkspace();

    const input = await screen.findByLabelText('Choose a course JSON file');
    const file = new File([JSON.stringify(importedCourse)], 'imported-course.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', {
      value: async () => JSON.stringify(importedCourse),
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(apiMock.importCourse).toHaveBeenCalledWith(importedCourse));
    expect(await screen.findByText('Imported Course')).toBeInTheDocument();
  });
});