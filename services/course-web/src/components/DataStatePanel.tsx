import {
  ArrowClockwiseRegular,
  BoxRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import {
  Body1,
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Skeleton,
  SkeletonItem,
  Title3,
} from '@fluentui/react-components';
import type { ReactNode } from 'react';

export type DataStatus = 'loading' | 'error' | 'empty' | 'data';

interface DataStatePanelProps {
  status: DataStatus;
  error?: string;
  onRetry: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  children: ReactNode;
}

export function DataStatePanel({
  status,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Start with a course brief to build this workspace.',
  emptyActionLabel = 'Create a course',
  onEmptyAction,
  children,
}: DataStatePanelProps) {
  if (status === 'loading') {
    return (
      <div className="loading-stack" aria-label="Loading course data" aria-busy="true">
        {[0, 1, 2].map((row) => (
          <Card appearance="outline" className="loading-row" key={row}>
            <Skeleton aria-hidden="true">
              <SkeletonItem shape="rectangle" size={16} />
              <SkeletonItem shape="rectangle" size={12} className="skeleton-copy" />
              <SkeletonItem shape="rectangle" size={12} className="skeleton-copy short" />
            </Skeleton>
          </Card>
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <MessageBar intent="error" className="state-message" role="alert">
        <ErrorCircleRegular className="state-message-icon" />
        <MessageBarBody>
          <MessageBarTitle>Course data could not be loaded</MessageBarTitle>
          <span>{error ?? 'The local API request did not complete.'}</span>
        </MessageBarBody>
        <Button appearance="secondary" icon={<ArrowClockwiseRegular />} onClick={onRetry}>
          Retry
        </Button>
      </MessageBar>
    );
  }

  if (status === 'empty') {
    return (
      <Card appearance="filled-alternative" className="empty-state">
        <span className="empty-state-icon" aria-hidden="true"><BoxRegular fontSize={36} /></span>
        <Title3>{emptyTitle}</Title3>
        <Body1 className="muted-copy">{emptyDescription}</Body1>
        {onEmptyAction && (
          <Button appearance="primary" onClick={onEmptyAction}>
            {emptyActionLabel}
          </Button>
        )}
      </Card>
    );
  }

  return <>{children}</>;
}
