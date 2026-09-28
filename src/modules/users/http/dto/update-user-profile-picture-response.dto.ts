import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserProfilePictureResponseDto {
  @ApiProperty({
    example: '/users/11111111-1111-4111-8111-111111111111/profile-picture',
    description: 'Rota autenticada para consultar a imagem salva.',
  })
  profilePic!: string;
}
