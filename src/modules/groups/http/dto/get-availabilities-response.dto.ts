import { ApiProperty } from "@nestjs/swagger";
import { GetAvailabilityUserResponseDto } from "./get-availability-user-response.dto";

export class AvailabilitiesResponseDto {
    @ApiProperty()
    date!: string;

    @ApiProperty()
    users!: Array<GetAvailabilityUserResponseDto>;
}