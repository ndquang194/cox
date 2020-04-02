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
import { Coworking } from '../models';
import { CoworkingRepository, UserRepository } from '../repositories';
import { parseRequest } from '../services/parseRequest';
import { saveFile } from '../services/storageFile';
import { AppResponse } from '../services/appresponse';
const loopback = require('loopback');



export class CoworkingController {
  constructor(
    @repository(CoworkingRepository)
    public coworkingRepository: CoworkingRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) { }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @post('/coworkings/create', {
    responses: {
      '200': {
        description: 'Create coworking',
      },
    },
  })
  async create(
    @requestBody({
      description: 'Create coworking',
      required: true,
      content: {
        'multipart/form-data': {
          'x-parser': 'stream',
          schema: {
            type: 'object',
            properties: {
              coworking: {
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
    @inject(RestBindings.Http.RESPONSE)
    response: Response,
  ): Promise<AppResponse> {
    let req: any = await parseRequest(request, response);
    let coworking: any = req.fields.coworking;
    if (!coworking)
      throw new AppResponse(400, 'Please submit a coworking');
    coworking = JSON.parse(req.fields.coworking);

    if (!coworking.name || !coworking.phone || !coworking.about || !coworking.service || !coworking.address || !coworking.location || !coworking.rooms)
      throw new AppResponse(400, 'Missing field');
    const lat = coworking.location[0];
    const lng = coworking.location[1];
    if (lat == undefined || lng == undefined || lat < -90 || lat > 90 || lng < -180 || lng > 180)
      throw new AppResponse(400, 'Error location');
    let rooms: any[] = coworking.rooms;
    for (let i = 0; i < rooms.length; i++)
      if (!rooms[i].name || !rooms[i].about || !RegExp('^[0-9]+$').test(rooms[i].maxPerson) || !RegExp('^[0-9]+$').test(rooms[i].price))
        throw new AppResponse(400, 'Room missing field');
    const photo = await saveFile(req.files, Path.images);
    coworking.photo = photo;
    delete coworking.rooms;
    coworking = await this.userRepository.coworkings(currentUserProfile[securityId]).create(coworking);
    for (let i = 0; i < rooms.length; i++) {
      rooms[i] = await this.coworkingRepository.rooms(coworking.id).create(rooms[i]);
    }
    coworking.rooms = rooms;
    return new AppResponse(200, 'Success', coworking);
  }


  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @get('/coworkings', {
    responses: {
      '200': {
        description: 'Array of Coworking model instances',

      },
    },
  })
  async find(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    return new AppResponse(200, 'Success', await this.userRepository.coworkings(currentUserProfile[securityId]).find({
      include: [{
        relation: 'rooms'
      }]
    }));
  }

  @get('/coworkings/{id}', {
    responses: {
      '200': {
        description: 'Coworking model instance',

      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.query.object('filter', getFilterSchemaFor(Coworking)) filter?: Filter<Coworking>,
  ): Promise<AppResponse> {
    return new AppResponse(200, 'Success', await this.coworkingRepository.findById(id, filter));
  }


  @get('/coworkings/near', {
    responses: {
      '200': {
        description: 'Array of User model instances',
      },
    },
  })
  async findCoworkingNear(
    @param.query.number('maxDistance') maxDistance?: number,
    @param.query.number('lat') lat?: number,
    @param.query.number('lng') lng?: number,
  ): Promise<AppResponse> {
    if (maxDistance == undefined || maxDistance < 0 || lat == undefined || lng == undefined || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new AppResponse(400, 'Missing field');
    const location = new loopback.GeoPoint(lat, lng);
    const filter: any = {
      where: {
        location: {
          near: location,
          maxDistance: maxDistance,
          unit: 'kilometers'
        }
      },
      include: [{
        relation: 'rooms'
      }]
    }
    let coworkings = await this.coworkingRepository.find(filter);
    coworkings.forEach(element => {
      element.distance = loopback.GeoPoint.distanceBetween(location, new loopback.GeoPoint(element.location), { type: 'kilometers' });
    });
    return new AppResponse(200, 'Success', coworkings);
  }

  // @get('/coworkings/near', {
  //   responses: {
  //     '200': {
  //       description: 'Array of User model instances',
  //       content: {
  //         'application/json': {
  //           schema: {
  //             type: 'array',
  //             items: getModelSchemaRef(Coworking, { includeRelations: true }),
  //           },
  //         },
  //       },
  //     },
  //   },
  // })
  // async findNear(
  //   @param.query.object('filter', getFilterSchemaFor(Coworking)) filter?: Filter<Coworking>,
  // ): Promise<any[]> {
  //   if (!filter || !filter.where) throw new HttpErrors.NotAcceptable();
  //   const where: any = filter.where;
  //   const location = new loopback.GeoPoint(where.location.near);
  //   let coworkings = await this.coworkingRepository.find(filter);
  //   coworkings.forEach(element => {
  //     element.distance = loopback.GeoPoint.distanceBetween(location, new loopback.GeoPoint(element.location), { type: 'kilometers' });
  //   });
  //   return coworkings;
  // }


  // @patch('/coworkings/{id}', {
  //   responses: {
  //     '204': {
  //       description: 'Coworking PATCH success',
  //     },
  //   },
  // })
  // @authenticate('jwt')
  // @authorize({
  //   allowedRoles: ['Admin'],
  //   voters: [basicAuthorization],
  // })
  // async updateById(
  //   @param.path.string('id') id: string,
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Coworking, { partial: true }),
  //       },
  //     },
  //   })
  //   coworking: Coworking,
  // ): Promise<void> {
  //   await this.coworkingRepository.updateById(id, coworking);
  // }

  // @put('/coworkings/{id}', {
  //   responses: {
  //     '204': {
  //       description: 'Coworking PUT success',
  //     },
  //   },
  // })
  // async replaceById(
  //   @param.path.string('id') id: string,
  //   @requestBody() coworking: Coworking,
  // ): Promise<void> {
  //   await this.coworkingRepository.replaceById(id, coworking);
  // }

  // @del('/coworkings/{id}', {
  //   responses: {
  //     '204': {
  //       description: 'Coworking DELETE success',
  //     },
  //   },
  // })
  // @authenticate('jwt')
  // @authorize({
  //   allowedRoles: ['Admin'],
  //   voters: [basicAuthorization],
  // })
  // async deleteById(
  //   @param.path.string('id') id: string,
  //   @inject(SecurityBindings.USER)
  //   currentUserProfile: UserProfile,
  // ): Promise<any> {
  //   await this.userRepository.coworkings(currentUserProfile[securityId]).delete({ id: id });
  //   return { message: 'delete success' }
  // }
}