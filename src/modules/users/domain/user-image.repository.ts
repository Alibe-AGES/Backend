export interface UserProfilePictureAccess {
  imageKey: string | null;
  requesterCanAccess: boolean;
}

export abstract class UserImageRepository {
  abstract findProfilePictureAccess(
    targetUserId: string,
    requesterUserId: string
  ): Promise<UserProfilePictureAccess | null>;
}
