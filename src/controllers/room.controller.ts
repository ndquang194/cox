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
  HttpErrors,
} from '@loopback/rest';
import { Room, Coworking } from '../models';
import { RoomRepository, CoworkingRepository, BookingRepository } from '../repositories';
import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { basicAuthorization } from '../services/basic.authorizor';
import { inject } from '@loopback/core';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import { AppResponse } from '../services/appresponse';


export class RoomController {
  constructor(
    @repository(RoomRepository)
    public roomRepository: RoomRepository,
    @repository(CoworkingRepository)
    public coworkingRepository: CoworkingRepository,
    @repository(BookingRepository)
    public bookingRepository: BookingRepository,
  ) { }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @post('coworking/{id}/rooms/add', {
    responses: {
      '200': {
        description: 'Room model instance',
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Room, {
            title: 'NewRoom',
            exclude: ['id'],
          }),
        },
      },
    })
    room: Omit<Room, 'id'>,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<AppResponse> {
    let coworking = await this.coworkingRepository.findById(id);
    if (!coworking)
      throw new AppResponse(400, 'Not found coworking');
    if (coworking.userId != currentUserProfile[securityId])
      throw new AppResponse(401, 'Access denied');
    return new AppResponse(200, 'Sucess', await this.coworkingRepository.rooms(id).create(room));
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
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
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let coworking = await this.roomRepository.coworking(id);
    if (coworking.userId != currentUserProfile[securityId])
      throw new AppResponse(401, "Access denied");
    await this.roomRepository.replaceById(id, room);
    return new AppResponse(200, 'Update sucess');
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @del('/rooms/{id}', {
    responses: {
      '204': {
        description: 'Room DELETE success',
      },
    },
  })
  async deleteById(
    @param.path.string('id') id: string,
    @requestBody() room: Room,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let coworking = await this.roomRepository.coworking(id);
    if (coworking.userId != currentUserProfile[securityId])
      throw new AppResponse(401, "Access denied");
    await this.roomRepository.deleteById(id);
    return new AppResponse(200, 'Delete sucess');
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @get('/rooms/{id}/bookings/history', {
    responses: {
      '204': {
        description: 'Room booking history',
      },
    },
  })
  async bookingHistory(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    if ((await this.roomRepository.coworking(id)).userId != currentUserProfile[securityId])
      throw new AppResponse(401, "Access denied");
    let transactionId = (await this.roomRepository.transactions(id).find()).map(e => e.id);
    let listDate: number[] = [];
    (await this.bookingRepository.find({ where: { transactionId: { inq: transactionId } } })).forEach(e => {
      if (listDate.indexOf(e.date_time.getTime()) == -1)
        listDate.push(e.date_time.getTime());
    });
    return new AppResponse(200, 'Success', listDate);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @get('/rooms/{id}/bookings/{date}', {
    responses: {
      '204': {
        description: 'Room booking date',
      },
    },
  })
  async bookingDate(
    @param.path.string('id') id: string,
    @param.path.number('date') date: number,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    if (date == undefined || date <= 0) throw new AppResponse(400, "date invaild");
    if ((await this.roomRepository.coworking(id)).userId != currentUserProfile[securityId])
      throw new AppResponse(401, "Access denied");
    let atransaction: any[] = [];
    let transactions = await this.roomRepository.transactions(id).find({ include: [{ relation: 'bookings' }], });
    transactions.forEach(e => {
      let check = false;
      e.bookings.forEach(e1 => {
        if (e1.date_time.getTime() == date)
          check = true;
      });
      if (check)
        atransaction.push(e);
    })
    return new AppResponse(200, 'Success', atransaction);
  }
}
