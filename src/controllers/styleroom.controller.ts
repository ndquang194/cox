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
} from '@loopback/rest';
import { StyleRoom } from '../models';
import { StyleRoomRepository } from '../repositories';
import { authorize } from '@loopback/authorization';
import { basicAuthorization } from '../services/basic.authorizor';
import { authenticate } from '@loopback/authentication';

export class StyleroomController {
  constructor(
    @repository(StyleRoomRepository)
    public styleRoomRepository: StyleRoomRepository,
  ) { }

  @post('/stylerooms', {
    responses: {
      '200': {
        description: 'StyleRoom model instance',
        content: { 'application/json': { schema: getModelSchemaRef(StyleRoom) } },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(StyleRoom, {
            title: 'NewStyleRoom',
            exclude: ['id'],
          }),
        },
      },
    })
    styleRoom: Omit<StyleRoom, 'id'>,
  ): Promise<StyleRoom> {
    return this.styleRoomRepository.create(styleRoom);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @get('/stylerooms', {
    responses: {
      '200': {
        description: 'Array of StyleRoom model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array'
            },
          },
        },
      },
    },
  })
  async find(): Promise<any[]> {
    const styleRooms = ['Share Room', 'Meeting Room'];
    return styleRooms;
  }

  @patch('/stylerooms', {
    responses: {
      '200': {
        description: 'StyleRoom PATCH success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(StyleRoom, { partial: true }),
        },
      },
    })
    styleRoom: StyleRoom,
    @param.query.object('where', getWhereSchemaFor(StyleRoom)) where?: Where<StyleRoom>,
  ): Promise<Count> {
    return this.styleRoomRepository.updateAll(styleRoom, where);
  }

  @get('/stylerooms/{id}', {
    responses: {
      '200': {
        description: 'StyleRoom model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(StyleRoom, { includeRelations: true }),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.query.object('filter', getFilterSchemaFor(StyleRoom)) filter?: Filter<StyleRoom>
  ): Promise<StyleRoom> {
    return this.styleRoomRepository.findById(id, filter);
  }

  @patch('/stylerooms/{id}', {
    responses: {
      '204': {
        description: 'StyleRoom PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(StyleRoom, { partial: true }),
        },
      },
    })
    styleRoom: StyleRoom,
  ): Promise<void> {
    await this.styleRoomRepository.updateById(id, styleRoom);
  }

  @put('/stylerooms/{id}', {
    responses: {
      '204': {
        description: 'StyleRoom PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() styleRoom: StyleRoom,
  ): Promise<void> {
    await this.styleRoomRepository.replaceById(id, styleRoom);
  }

  @del('/stylerooms/{id}', {
    responses: {
      '204': {
        description: 'StyleRoom DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.styleRoomRepository.deleteById(id);
  }
}
