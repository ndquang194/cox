import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
  Entity,
  property,
  model,
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
  RestBindings,
  requestBody,
} from '@loopback/rest';
import { Booking, StyleRoom, Transaction } from '../models';
import { BookingRepository, StyleRoomRepository, TransactionRepository } from '../repositories';
import { authorize } from '@loopback/authorization';
import { authenticate, TokenService } from '@loopback/authentication';
import { TokenServiceBindings } from '../services/key';
import { basicAuthorization } from '../services/basic.authorizor';
import { UserRepository } from '../repositories';
import { inject } from '@loopback/context';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import { AppResponse } from '../services/appresponse';
import { CreateBooking } from '../services/booking.api';
import { MyDefault } from '../services/mydefault';
import { start } from 'repl';
import _ from 'lodash';



export class BookingController {
  constructor(
    @repository(TransactionRepository)
    public transactionRepository: TransactionRepository,
    @repository(BookingRepository)
    public bookingRepository: BookingRepository,
    @repository(StyleRoomRepository)
    public styleRoomRepository: StyleRoomRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService
  ) { }

  async checkCondition(createBooking: CreateBooking) {
    let result = {
      status: false,
      message: '',
      data: []
    };
    try {
      if (createBooking.duration < 0 || !createBooking.numberPerson || createBooking.listDate.length == 0 ||
        !createBooking.style_room_id || createBooking.startTime < 0 || !createBooking.price) {
        result.message = "missing field";
        return result;
      } else {
        let bookings: any = [];
        let styleRoom = await this.styleRoomRepository.findById(createBooking.style_room_id);
        if (createBooking.numberPerson > styleRoom.maxPerson) {
          result.message = "not enough person";
          return result;
        } else {
          let endTime = createBooking.startTime + createBooking.duration;
          let price = createBooking.numberPerson * styleRoom.price * createBooking.duration;
          if (createBooking.price == price) {
            for (var i = 0; i < createBooking.listDate.length; i++) {
              let day = createBooking.listDate[i];
              let date = new Date();
              date.setHours(0, 0, 0, 0);
              date.setFullYear(parseInt(day.substring(6, 10)), parseInt(day.substring(3, 5)), parseInt(day.substring(0, 2)));
              console.log(date);
              let aBookings = await this.bookingRepository.find({
                where: {
                  date_time: date,
                  status: MyDefault.BOOKING_STATUS.PENDING || MyDefault.BOOKING_STATUS.ON_GOING
                }
              });
              if (aBookings != undefined) {
                for (var j = 0; j < aBookings.length; j++) {
                  let numPer = styleRoom.maxPerson - aBookings[j].numPerson;
                  if (((aBookings[j].start_time < createBooking.startTime || createBooking.startTime < aBookings[j].end_time) || (aBookings[j].start_time < endTime || endTime < aBookings[j].end_time)) && createBooking.numberPerson <= numPer) {
                    result.message = "not enough person";
                    return result;
                  }
                }
              }
              let booking = new Booking();
              booking.numPerson = createBooking.numberPerson;
              booking.start_time = createBooking.startTime;
              booking.end_time = endTime;
              booking.date_time = date;
              booking.status = MyDefault.BOOKING_STATUS.PENDING;
              booking.styleRoomId = styleRoom.id;
              bookings.push(booking);
            }
          } else {
            result.message = 'err price';
            return result;
          }
        }
        result.status = true;
        result.message = 'success';
        result.data = bookings;
      }
      return result;
    } catch (err) {
      throw err;
    }
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @post('/bookings', {
    responses: {
      '200': {
        description: 'Booking is created',
        content: { 'application/json': AppResponse },
      },
    },
  })
  async create(
    @requestBody() createBooking: CreateBooking,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<any> {
    try {
      console.log(createBooking);
      let transaction = new Transaction;
      transaction.status = MyDefault.TRANSACTION_STATUS.PENDING;
      transaction.create_at = new Date();
      transaction.update_at = new Date();
      let user = await this.userRepository.findById(currentUserProfile[securityId]);
      let styleRoom = await this.styleRoomRepository.findById(createBooking.style_room_id);
      transaction = await this.transactionRepository.create(_.omit(transaction, 'price'));
      let result = await this.checkCondition(createBooking);
      console.log(result);
      if (result.status) {
        for (var i = 0; i < result.data.length; i++) {
          let booking: any = result.data[i];
          booking.userId = user.id;
          booking.transactionId = transaction.id;
          booking = await this.bookingRepository.create(booking);
          user.bookingIDs.push(booking.id);
          transaction.bookingIDs.push(booking.id);
          styleRoom.bookingIDs.push(booking.id);
        }
      } else {
        return new AppResponse(404, result.message, {});
      }
      transaction.price = createBooking.price;
      await this.userRepository.update(user);
      await this.transactionRepository.update(transaction);
      await this.styleRoomRepository.update(styleRoom);
      return new AppResponse(200, result.message, {});
    } catch (err) {
      throw err;
    }

  }

  // @get('/bookings/count', {
  //   responses: {
  //     '200': {
  //       description: 'Booking model count',
  //       content: { 'application/json': { schema: CountSchema } },
  //     },
  //   },
  // })
  // async count(
  //   @param.where(Booking) where?: Where<Booking>,
  // ): Promise<Count> {
  //   return this.bookingRepository.count(where);
  // }

  // @get('/bookings', {
  //   responses: {
  //     '200': {
  //       description: 'Array of Booking model instances',
  //       content: {
  //         'application/json': {
  //           schema: {
  //             type: 'array',
  //             items: getModelSchemaRef(Booking, { includeRelations: true }),
  //           },
  //         },
  //       },
  //     },
  //   },
  // })
  // async find(
  //   @param.filter(Booking) filter?: Filter<Booking>,
  // ): Promise<Booking[]> {
  //   return this.bookingRepository.find(filter);
  // }

  // @patch('/bookings', {
  //   responses: {
  //     '200': {
  //       description: 'Booking PATCH success count',
  //       content: { 'application/json': { schema: CountSchema } },
  //     },
  //   },
  // })
  // async updateAll(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Booking, { partial: true }),
  //       },
  //     },
  //   })
  //   booking: Booking,
  //   @param.where(Booking) where?: Where<Booking>,
  // ): Promise<Count> {
  //   return this.bookingRepository.updateAll(booking, where);
  // }

  // @get('/bookings/{id}', {
  //   responses: {
  //     '200': {
  //       description: 'Booking model instance',
  //       content: {
  //         'application/json': {
  //           schema: getModelSchemaRef(Booking, { includeRelations: true }),
  //         },
  //       },
  //     },
  //   },
  // })
  // async findById(
  //   @param.path.string('id') id: string,
  //   @param.filter(Booking, { exclude: 'where' }) filter?: FilterExcludingWhere<Booking>
  // ): Promise<Booking> {
  //   return this.bookingRepository.findById(id, filter);
  // }

  @patch('/bookings/{id}', {
    responses: {
      '204': {
        description: 'Booking PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Booking, { partial: true }),
        },
      },
    })
    booking: Booking,
  ): Promise<void> {
    await this.bookingRepository.updateById(id, booking);
  }

  @put('/bookings/{id}', {
    responses: {
      '204': {
        description: 'Booking PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() booking: Booking,
  ): Promise<void> {
    await this.bookingRepository.replaceById(id, booking);
  }

  @del('/bookings/{id}', {
    responses: {
      '204': {
        description: 'Booking DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.bookingRepository.deleteById(id);
  }
}
