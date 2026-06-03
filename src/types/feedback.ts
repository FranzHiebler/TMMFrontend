export type FeedbackType = "Info" | "Suggestion" | "Bug";
export type FeedbackStatus = "Open" | "InProgress" | "Done" | "Ignored";

export interface FeedbackContextRequest {
  pageUrl?: string | null;
  pathname?: string | null;
  search?: string | null;
  hash?: string | null;
  pageTitle?: string | null;
  userAgent?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  referrer?: string | null;
}

export interface CreateFeedbackRequest {
  type: FeedbackType;
  reporterName?: string | null;
  message: string;
  context: FeedbackContextRequest;
}

export interface UpdateFeedbackAdminRequest {
  status: FeedbackStatus;
  adminNote?: string | null;
}

export interface FeedbackResponse {
  id: string;
  ticketNumber?: string | null;
  type: FeedbackType;
  message: string;
  userId: string;
  displayName: string;
  reporterName?: string | null;
  pageUrl?: string | null;
  pathname?: string | null;
  search?: string | null;
  hash?: string | null;
  pageTitle?: string | null;
  userAgent?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  referrer?: string | null;
  createdAtUtc: string;
  status: FeedbackStatus;
  adminNote?: string | null;
  resolvedAtUtc?: string | null;
}
