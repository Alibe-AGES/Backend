import { ApiProperty } from "@nestjs/swagger";

export class GetAvailabilityUserResponseDto {
    @ApiProperty({ format: 'uuid' })
    id!: string;
    
    @ApiProperty()
    name!: string;

    @ApiProperty()
    image!: string;

    @ApiProperty()
    availableAllDay!: boolean;

    @ApiProperty()
    intervals!: Array<[string, string]>;
}