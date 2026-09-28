export interface UserProfilePictureAccess {
  imageKey: string | null;
  requesterCanAccess: boolean;
}

export interface UpdatedUserProfilePicture {
  previousImageKey: string | null;
}

export abstract class UserImageRepository {
  abstract findProfilePictureAccess(
    targetUserId: string,
    requesterUserId: string
  ): Promise<UserProfilePictureAccess | null>;

  abstract updateProfilePicture(
    userId: string,
    profilePic: string
  ): Promise<UpdatedUserProfilePicture | null>;
}
