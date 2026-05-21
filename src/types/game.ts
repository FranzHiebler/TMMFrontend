export type GameSessionState = "Open" | "Full" | "Closed" | "Cancelled";
export type ApplicationStatus = "Pending" | "Accepted" | "Rejected" | "Withdrawn";
export type ChangeProposalStatus = "Pending" | "Accepted" | "Rejected";
export type LocationRole = "Owner" | "Admin" | "Manager" | "Member" | "Applicant";
export type ProfileFieldVisibility = "Public" | "FriendsOnly" | "Private";

export interface ParticipantDto {
  userId: string;
  displayName: string;
}

export interface LocationMemberResponse {
  userId: string;
  displayName: string;
  role: LocationRole;
}

export interface UpsertLocationMemberRequest {
  userId: string;
  displayName: string;
  role: LocationRole;
}

export interface LocationSnapshotDto {
  name: string;
  city: string;
}

export interface TableApplicationDto {
  id: string;
  tableId?: string | null;
  player: ParticipantDto;
  systemKey?: string | null;
  message?: string | null;
  status: ApplicationStatus;
  createdAt: string;
}

export interface GameTableDto {
  id: string;
  name: string;
  maxPlayers: number;
  systems: string[];
  scenario?: string | null;
  points?: number | null;
  startTimeUtc?: string | null;
  notes?: string | null;
  assignedPlayers: ParticipantDto[];
  applications: TableApplicationDto[];
  openSlots: number;
}

export interface GameChangeProposalDto {
  id: string;
  tableId?: string | null;
  proposedBy: ParticipantDto;
  proposedStartTimeUtc?: string | null;
  proposedSystems?: string[] | null;
  proposedPoints?: number | null;
  message?: string | null;
  status: ChangeProposalStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface GameResponse {
  id: string;
  title: string;
  host: ParticipantDto;
  status: GameSessionState;
  joinMode: GameJoinMode;
  locationId: string;
  location: LocationSnapshotDto;
  clubId?: string | null;
  startTimeUtc: string;
  description?: string | null;
  tables: GameTableDto[];
  changeProposals: GameChangeProposalDto[];
  maxPlayers: number;
  assignedPlayers: number;
  openSlots: number;
}

export interface CreateGameTableRequest {
  name: string;
  maxPlayers: number;
  systems: string[];
  scenario?: string | null;
  points?: number | null;
  startTimeUtc?: string | null;
  notes?: string | null;
}

export interface CreateGameRequest {
  title: string;
  locationId: string;
  clubId?: string | null;
  startTimeUtc: string;
  description?: string | null;
  joinMode: GameJoinMode;
  tables: CreateGameTableRequest[];
}

export interface JoinTableRequest {
  systemKey?: string | null;
}

export interface ApplyToGameRequest {
  tableId?: string | null;
  systemKey?: string | null;
  message?: string | null;
}

export interface CreateChangeProposalRequest {
  tableId?: string | null;
  proposedStartTimeUtc?: string | null;
  proposedSystems?: string[] | null;
  proposedPoints?: number | null;
  message?: string | null;
}

export interface LocationOption {
  id: string;
  name: string;
  city: string;
}

export type SystemOption = {
  key: string;
  name: string;
  shortCode?: string | null;
  color?: string | null;
  markerColor?: string | null;
};

export interface SearchNearbyGamesRequest {
  latitude: number;
  longitude: number;
  radiusKm: number;
  systemKey?: string;
}

export interface DiscoveryGamesRequest {
  fromUtc?: string;
  toUtc?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface GameDiscoveryResponse {
  gameId: string;
  title: string;
  startTimeUtc: string;
  locationId: string;
  locationName: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  status: GameSessionState;
  isHost: boolean;
  isParticipant: boolean;
  isOwnLocation: boolean;
  canEdit: boolean;
  tablesSummary: string;
  availableSeats: number;
  joinMode: GameJoinMode;
  applicationStatus?: string | null;
}

export interface SearchNearbyLocationsRequest {
  latitude: number;
  longitude: number;
  radiusKm: number;
  systemKey?: string;
}

export interface LocationResponse {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  role?: LocationRole | null;
  isOpen?: boolean;
  systemKeys: string[];
  hasPendingJoinRequest?: boolean;
}

export interface LocationDiscoveryResponse {
  locationId: string;
  name: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isOwnLocation: boolean;
  isOpen: boolean;
  role?: LocationRole | null;
  systemKeys: string[];
  upcomingGameCount: number;
  nextGameStartTimeUtc?: string | null;
}

export interface CreateLocationRequest {
  name: string;
  city: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  systemKeys: string[];
}

export const GameJoinMode = {
  ApprovalRequired: "ApprovalRequired",
  FirstComeFirstServe: "FirstComeFirstServe",
} as const;

export type GameJoinMode = typeof GameJoinMode[keyof typeof GameJoinMode];

export interface UserSearchResponse {
  userId: string;
  displayName: string;
  email?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LocationJoinRequestResponse {
  id: string;
  userId: string;
  displayName: string;
  message?: string | null;
  status: string;
  createdAt: string;
}

export interface UserProfileVisibility {
  email: ProfileFieldVisibility;
  phoneNumber: ProfileFieldVisibility;
  streetAddress: ProfileFieldVisibility;
  postalCode: ProfileFieldVisibility;
  city: ProfileFieldVisibility;
  tabletopTo: ProfileFieldVisibility;
  tabletopHerald: ProfileFieldVisibility;
  t3: ProfileFieldVisibility;
  newRecruit: ProfileFieldVisibility;
  bestSportsPairings: ProfileFieldVisibility;
}

export interface UserProfileResponse {
  userId: string;
  displayName: string;
  email?: string | null;
  phoneNumber?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  city?: string | null;
  tabletopTo?: string | null;
  tabletopHerald?: string | null;
  t3?: string | null;
  newRecruit?: string | null;
  bestSportsPairings?: string | null;
  profileImageUrl?: string | null;
  defaultLocationId?: string | null;
  canBeContacted: boolean;
  visibility: UserProfileVisibility;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateUserProfileRequest {
  displayName: string;
  email?: string | null;
  phoneNumber?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  city?: string | null;
  tabletopTo?: string | null;
  tabletopHerald?: string | null;
  t3?: string | null;
  newRecruit?: string | null;
  bestSportsPairings?: string | null;
  profileImageUrl?: string | null;
  defaultLocationId?: string | null;
  canBeContacted: boolean;
  visibility: UserProfileVisibility;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateGameSessionRequest {
  title: string;
  startTimeUtc: string;
  description?: string | null;
}

export interface UpdateGameTableRequest {
  name: string;
  maxPlayers: number;
  systems: string[];
  scenario?: string | null;
  points?: number | null;
  startTimeUtc?: string | null;
  notes?: string | null;
}

export type MessageKind = "Direct" | "GameSession" | "GameTable";
export type NotificationKind =
  | "DirectMessage"
  | "GameSessionMessage"
  | "GameTableMessage"
  | "ApplicationAccepted"
  | "ApplicationRejected"
  | "FriendRequest"
  | "FriendAccepted";

export type FriendshipStatus = "Pending" | "Accepted" | "Rejected" | "Blocked";

export interface MessageDto {
  id: string;
  kind: MessageKind;
  conversationId?: string | null;
  gameId?: string | null;
  tableId?: string | null;
  author: ParticipantDto;
  body: string;
  createdAtUtc: string;
  isMine: boolean;
}

export interface ConversationDto {
  id: string;
  participants: ParticipantDto[];
  lastMessagePreview?: string | null;
  lastMessageAtUtc?: string | null;
  unreadCount: number;
}

export interface ConversationDetailDto extends ConversationDto {
  messages: MessageDto[];
}

export interface MessageRecipientRequest {
  userId: string;
  displayName: string;
}

export interface SendDirectMessageRequest {
  conversationId?: string | null;
  recipients: MessageRecipientRequest[];
  body: string;
}

export interface SendGameSessionMessageRequest {
  body: string;
}

export interface SendGameTableMessageRequest {
  body: string;
}

export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAtUtc: string;
}

export interface FriendDto {
  id: string;
  userId: string;
  displayName: string;
  status: FriendshipStatus;
  updatedAtUtc: string;
}

export interface FriendRequestDto {
  id: string;
  requesterUserId: string;
  requesterDisplayName: string;
  createdAtUtc: string;
}

export interface SendFriendRequestRequest {
  receiverUserId: string;
  receiverDisplayName: string;
}

export interface PublicUserProfileResponse {
  userId: string;
  displayName: string;
  email?: string | null;
  phoneNumber?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  city?: string | null;
  tabletopTo?: string | null;
  tabletopHerald?: string | null;
  t3?: string | null;
  newRecruit?: string | null;
  bestSportsPairings?: string | null;
  profileImageUrl?: string | null;
  canBeContacted: boolean;
  isFriend: boolean;
  hiddenFields: string[];
}