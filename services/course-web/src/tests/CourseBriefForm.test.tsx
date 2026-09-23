import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CourseBriefForm } from '../components/CourseBriefForm';

describe('CourseBriefForm', () => {
  it('starts with test mode off and explains both generation sizes', () => {
    render(<CourseBriefForm isGenerating={false} selectedBrief={null} onGenerate={vi.fn()} />);

    expect(screen.getByRole('switch', { name: 'Test mode' })).not.toBeChecked();
    expect(screen.getByText(/Off generates 12 lectures\. On generates one lecture/)).toBeInTheDocument();
  });

  it('submits one-lecture test mode when enabled', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(<CourseBriefForm isGenerating={false} selectedBrief={null} onGenerate={onGenerate} />);

    await user.click(screen.getByRole('switch', { name: 'Test mode' }));
    await user.click(screen.getByRole('button', { name: 'Generate course' }));

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Linear Algebra',
      courseCode: 'MATH 221',
      testMode: true,
      learningOutcomes: ['Work with vector spaces, linear transformations, matrices, and eigenvalues.'],
    }));
  });

  it('applies the selected brief level to the generated course request', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <CourseBriefForm
        isGenerating={false}
        selectedBrief={{
          title: 'Philosophy of Mind',
          courseCode: 'PHIL 640',
          level: 'Graduate',
          description: 'A graduate philosophy brief.',
          kind: 'suggested',
          generationLabel: '12 lectures by default',
          learningOutcomes: ['Compare theories of consciousness.'],
        }}
        onGenerate={onGenerate}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Course level' })).toHaveTextContent('Graduate');
    await user.click(screen.getByRole('button', { name: 'Generate course' }));

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Philosophy of Mind',
      courseCode: 'PHIL 640',
      level: 'Graduate',
      learningOutcomes: ['Compare theories of consciousness.'],
    }));
  });
});
