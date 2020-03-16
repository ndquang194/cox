import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getModelSchemaRef,
  getWhereSchemaFor,
  patch,
  put,
  del,
  requestBody,
  Request,
  RequestBody,
  RestBindings,
  Response
} from '@loopback/rest';
import { HttpErrors } from '@loopback/rest';
import { authenticate, TokenService, UserService } from '@loopback/authentication';
import { inject } from '@loopback/context';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import { OPERATION_SECURITY_SPEC } from '../ultils/security-spec';
import { PasswordHasherBindings, TokenServiceBindings, UserServiceBindings, Path } from '../services/key';
import { authorize } from '@loopback/authorization';
import { basicAuthorization } from '../services/basic.authorizor';
import { Room } from '../models';
import { RoomRepository, UserRepository } from '../repositories';
import { parseRequest } from '../services/parseRequest';
import { saveFile } from '../services/storageFile';


export class RoomController {
  constructor(
    @repository(RoomRepository)
    public roomRepository: RoomRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService
  ) { }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @post('/rooms', {
    responses: {
      '200': {
        description: 'Room model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Room) } },
      },
    },
  })
  async create(
    @requestBody({
      description: 'Create room',
      required: true,
      content: {
        'multipart/form-data': {
          'x-parser': 'stream',
          schema: {
            type: 'object',
            properties: {
              room: {
                type: 'string'
              }
            }
          },
        },
      },
    })
    request: Request,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<any> {
    let req: any = await parseRequest(request, response);
    if (!req.fields.room)
      throw new HttpErrors.NotAcceptable('Please submit room');
    const photo = await saveFile(req.files, Path.images);
    req.fields.room = JSON.parse(req.fields.room);
    req.fields.room.photo = photo;
    let styleRooms: any[] = req.fields.room.styleRooms;
    delete req.fields.room.styleRooms;
    let room = await this.userRepository.rooms(currentUserProfile[securityId]).create(req.fields.room);
    styleRooms.forEach(async (element) => {
      await this.roomRepository.styleRooms(room.id).create(element);
    });
    return room;
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @get('/rooms', {
    responses: {
      '200': {
        description: 'Array of Room model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Room, { includeRelations: true }),
            },
          },
        },
      },
    },
  })
  async findRooms(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.query.object('filter', getFilterSchemaFor(Room)) filter?: Filter<Room>,
  ): Promise<Room[]> {
    return await this.userRepository.rooms(currentUserProfile[securityId]).find(filter);
  }

  @get('user/{id}/rooms', {
    responses: {
      '200': {
        description: 'Array of Room model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Room, { includeRelations: true }),
            },
          },
        },
      },
    },
  })
  async find(@param.path.string('id') id: string,
    @param.query.object('filter', getFilterSchemaFor(Room)) filter?: Filter<Room>, ): Promise<Room[]> {
    return this.userRepository.rooms(id).find(filter);
  }

  @get('/rooms/{id}', {
    responses: {
      '200': {
        description: 'Room model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Room, { includeRelations: true }),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.query.object('filter', getFilterSchemaFor(Room)) filter?: Filter<Room>
  ): Promise<Room> {
    return this.roomRepository.findById(id, filter);
  }

  @patch('/rooms/{id}', {
    responses: {
      '204': {
        description: 'Room PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Room, { partial: true }),
        },
      },
    })
    room: Room,
  ): Promise<void> {
    await this.roomRepository.updateById(id, room);
  }

  @put('/rooms/{id}', {
    responses: {
      '204': {
        description: 'Room PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() room: Room,
  ): Promise<void> {
    await this.roomRepository.replaceById(id, room);
  }

  @del('/rooms/{id}', {
    responses: {
      '204': {
        description: 'Room DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.roomRepository.deleteById(id);
  }
}
