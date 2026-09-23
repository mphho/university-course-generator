import {
  Badge,
  Body2,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Text,
} from '@fluentui/react-components';
import {
  CalendarRegular,
  DocumentBulletListRegular,
} from '@fluentui/react-icons';
import type { Assessment } from '../types/course';
import { useState } from 'react';

interface AssessmentCardProps {
  assessment: Assessment;
}

export function AssessmentCard({ assessment }: AssessmentCardProps) {
  const [open, setOpen] = useState(false);
  const isAssignment = assessment.kind === 'assignment';
  const meta = isAssignment
    ? `${assessment.points} points · ${assessment.problemCount} problems`
    : `${assessment.durationMinutes} minutes · ${assessment.questionCount} questions`;

  return (
    <Card appearance="outline" className="assessment-card">
      <div className="assessment-card-topline">
        <span className="assessment-icon" aria-hidden="true"><DocumentBulletListRegular /></span>
        <Badge appearance="tint" color={assessment.status === 'Ready' ? 'success' : 'warning'}>
          {assessment.status}
        </Badge>
      </div>
      <Text className="assessment-title" weight="semibold">{assessment.title}</Text>
      <Body2 className="assessment-description">{assessment.description}</Body2>
      <div className="assessment-meta">
        <CalendarRegular aria-hidden="true" />
        <span>{meta}</span>
      </div>
      <div className="draft-note">{assessment.status === 'Draft' ? 'Draft · review before release' : 'Ready for instructor review'}</div>
      <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <Button appearance="subtle" onClick={() => setOpen(true)}>View details</Button>
        </DialogTrigger>
        <DialogSurface className="assessment-dialog-surface">
          <DialogBody>
            <DialogTitle>{assessment.title}</DialogTitle>
            <DialogContent className="assessment-dialog-content">
              <Body2>{assessment.description}</Body2>
              <Text size={200} className="dialog-meta">{assessment.coverage} · {meta} · {assessment.status}</Text>
              {assessment.kind === 'assignment' && assessment.problems && assessment.problems.length > 0 ? (
                <>
                  <Text weight="semibold">Problems</Text>
                  <ol className="detail-list">
                    {assessment.problems.map((problem, index) => (
                      <li key={`${assessment.id}-problem-${index}`}>
                        <Text weight="semibold">{index + 1}. {problem.prompt}</Text>
                        <Text size={200}>{problem.learningOutcome} · {problem.points} points · {problem.difficulty}</Text>
                        <Text size={200}>Expected answer: {problem.expectedAnswer}</Text>
                        <Text size={200}>Hints: {problem.hints.join(' · ')}</Text>
                      </li>
                    ))}
                  </ol>
                </>
              ) : assessment.kind !== 'assignment' && assessment.questions && assessment.questions.length > 0 ? (
                <>
                  <Text weight="semibold">Questions</Text>
                  <ol className="detail-list">
                    {assessment.questions.map((question, index) => (
                      <li key={`${assessment.id}-question-${index}`}>
                        <Text weight="semibold">{index + 1}. {question.prompt}</Text>
                        <Text size={200}>{question.section} · {question.learningOutcome} · {question.points} points</Text>
                        <Text size={200}>Expected solution: {question.expectedSolution}</Text>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <div className="detail-placeholder">
                  <Text weight="semibold">Summary only</Text>
                  <Body2>This starter assessment has planning details but no generated prompts or solutions yet. Generate an assignment or exam to create reviewable assessment content.</Body2>
                </div>
              )}
              {assessment.kind === 'assignment' && assessment.rubric.length > 0 && (
                <div className="detail-placeholder">
                  <Text weight="semibold">Review rubric</Text>
                  <ul className="detail-list">{assessment.rubric.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="primary" onClick={() => setOpen(false)}>Close</Button>
              </DialogTrigger>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </Card>
  );
}
