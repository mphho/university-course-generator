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
});
