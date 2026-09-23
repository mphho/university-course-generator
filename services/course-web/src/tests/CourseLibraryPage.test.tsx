import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import type { Course, CourseResponse } from '../types/course';
import { CourseLibraryPage } from '../pages/CourseLibraryPage';

const generatedCourse: Course = {
  id: 'linear-algebra',
  title: 'Linear Algebra',
  courseCode: 'MATH 221',
  level: 'Undergraduate',
  description: 'A course in linear algebra.',
  learnerProfile: 'Undergraduate learners.',
  prerequisites: [],
  learningOutcomes: ['Work with vector spaces and linear transformations.'],
  units: [],
  lectures: [],
  lecturePlan: [],
  conceptDependencies: [],
  assessmentBlueprint: [],
  scopeLimits: [],
  assessments: [],
  contentReviewStatus: 'draft',
};

describe('CourseLibraryPage generation progress', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listCourses').mockResolvedValue({ courses: [] });
    vi.spyOn(api, 'listSuggestedBriefs').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows generation steps and the submitted brief until the draft is ready', async () => {
    const user = userEvent.setup();
    let completeGeneration!: (response: CourseResponse) => void;
    const generationPromise = new Promise<CourseResponse>((resolve) => {
      completeGeneration = resolve;
    });
    vi.spyOn(api, 'generateCourse').mockReturnValue(generationPromise);

    render(
      <MemoryRouter>
        <CourseLibraryPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Generate course' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Elapsed 00:00');
    expect(dialog).toHaveTextContent('Plan the course map');
    expect(dialog).toHaveTextContent('Generate lecture content');
    expect(dialog).toHaveTextContent('Validate and save the draft');
    expect(dialog).toHaveTextContent('Linear Algebra · MATH 221 · Undergraduate');
    expect(dialog).toHaveTextContent('12 lectures requested · 1 learning outcome');
    expect(dialog).toHaveTextContent('Work with vector spaces, linear transformations, matrices, and eigenvalues.');

    await act(async () => {
      completeGeneration({ course: generatedCourse });
    });

    expect(await screen.findByText('Linear Algebra is ready as a draft')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});