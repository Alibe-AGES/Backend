import { ApiProperty } from "@nestjs/swagger";

export class ResponseDto {
    @ApiProperty({ format: 'uuid' })
    id!: string;

    @ApiProperty()
    answer!: string;

    @ApiProperty()
    createdAt!: Date;

    @ApiProperty({ format: 'uuid' })
    userId!: string;

    @ApiProperty()
    userName!: string;
    
    @ApiProperty()
    userProfilePic!: string;
}