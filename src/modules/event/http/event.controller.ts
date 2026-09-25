import { Controller, Get, Param, Request, ParseUUIDPipe } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { GetEventUseCase } from "../application/get-event.use-case";
import { EventDetailsResponseDto } from "./dto/event-details-response.dto";
import { AuthenticatedRequest } from "src/modules/auth/http/authenticated-user";

@ApiTags('Event')
@Controller('event')
export class EventController {
    constructor(private readonly getEventUseCase: GetEventUseCase) {}

    @Get(':id')
    @ApiOperation({ summary: 'Consulta todos os dados de um evento '})
    @ApiParam({ name: 'id', format: 'uuid'})
    @ApiOkResponse({ type: EventDetailsResponseDto })
    @ApiNotFoundResponse({ description: 'Evento não encontrado' })
    async get(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Request() request: AuthenticatedRequest
    ): Promise<EventDetailsResponseDto> {

        return this.getEventUseCase.execute(id);
    }
}