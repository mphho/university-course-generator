import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner,
  Text,
} from '@fluentui/react-components';
import type { CourseBriefInput } from '../types/course';

interface CourseGenerationDialogProps {
  open: boolean;
  request: CourseBriefInput | null;
}

const generationSteps = [
  {
    title: 'Plan the course map',
    description: 'Organize outcomes, prerequisites, lecture sequence, and assessment alignment.',
  },
  {
    title: 'Generate lecture content',
    description: 'Build complete lecture notes, worked examples, applications, and practice.',
  },
  {
    title: 'Validate and save the draft',
    description: 'Check the generated structure and write the course snapshot to the local archive.',
  },
];

function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function CourseGenerationDialog({ open, request }: CourseGenerationDialogProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!open) return undefined;

    const startedAt = Date.now();
    const updateElapsedTime = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    updateElapsedTime();
    const intervalId = window.setInterval(updateElapsedTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [open]);

  const lectureCount = request?.testMode ? 1 : 12;
  const visibleOutcomes = request?.learningOutcomes.slice(0, 3) ?? [];
  const remainingOutcomeCount = Math.max((request?.learningOutcomes.length ?? 0) - visibleOutcomes.length, 0);

  return (
    <Dialog open={open} modalType="modal">
      <DialogSurface className="generation-dialog-surface">
        <DialogBody>
          <DialogTitle>Building your course</DialogTitle>
          <DialogContent className="generation-dialog-content">
            <div className="generation-status">
              <Spinner size="medium" />
              <div className="generation-status-copy">
                <Text weight="semibold" role="status">Generation is in progress</Text>
                <Text size={200} aria-live="off">Elapsed {formatElapsedTime(elapsedSeconds)}</Text>
              </div>
            </div>

            <section className="generation-workflow" aria-labelledby="generation-workflow-title">
              <Text id="generation-workflow-title" weight="semibold">Course generation workflow</Text>
              <ol className="generation-step-list">
                {generationSteps.map((step, index) => (
                  <li className="generation-step" key={step.title}>
                    <span className="generation-step-number" aria-hidden="true">{index + 1}</span>
                    <div className="generation-step-copy">
                      <Text weight="semibold">{step.title}</Text>
                      <Text size={200}>{index === 1 ? `${lectureCount} lecture${lectureCount === 1 ? '' : 's'}: ${step.description}` : step.description}</Text>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {request && (
              <section className="generation-brief" aria-labelledby="generation-brief-title">
                <Text id="generation-brief-title" weight="semibold">Submitted brief</Text>
                <Text>{request.title} <span aria-hidden="true">·</span> {request.courseCode} <span aria-hidden="true">·</span> {request.level}</Text>
                <Text size={200}>{lectureCount} lecture{lectureCount === 1 ? '' : 's'} requested · {request.learningOutcomes.length} learning outcome{request.learningOutcomes.length === 1 ? '' : 's'}</Text>
                {visibleOutcomes.length > 0 && (
                  <ul className="generation-outcome-list">
                    {visibleOutcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
                  </ul>
                )}
                {remainingOutcomeCount > 0 && (
                  <Text size={200}>{remainingOutcomeCount} additional outcome{remainingOutcomeCount === 1 ? '' : 's'} included</Text>
                )}
              </section>
            )}

            <Text size={200} className="generation-stream-note">
              The complete draft will appear here when generation finishes.
            </Text>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}