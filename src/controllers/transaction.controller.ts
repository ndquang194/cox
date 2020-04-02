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
import { Transaction } from '../models';
import { TransactionRepository, RoomRepository } from '../repositories';
import { authenticate } from '@loopback/authentication';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import { inject } from '@loopback/core';
import { AppResponse } from '../services/appresponse';

export class TransactionController {
  constructor(
    @repository(TransactionRepository)
    public transactionRepository: TransactionRepository,
    @repository(RoomRepository)
    public roomrepository: RoomRepository,
  ) { }

  // @post('/transactions', {
  //   responses: {
  //     '200': {
  //       description: 'Transaction model instance',
  //       content: { 'application/json': { schema: getModelSchemaRef(Transaction) } },
  //     },
  //   },
  // })
  // async create(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Transaction, {
  //           title: 'NewTransaction',
  //           exclude: ['id'],
  //         }),
  //       },
  //     },
  //   })
  //   transaction: Omit<Transaction, 'id'>,
  // ): Promise<Transaction> {
  //   return this.transactionRepository.create(transaction);
  // }

  // @get('/transactions/count', {
  //   responses: {
  //     '200': {
  //       description: 'Transaction model count',
  //       content: { 'application/json': { schema: CountSchema } },
  //     },
  //   },
  // })
  // async count(
  //   @param.where(Transaction) where?: Where<Transaction>,
  // ): Promise<Count> {
  //   return this.transactionRepository.count(where);
  // }

  // @get('/transactions', {
  //   responses: {
  //     '200': {
  //       description: 'Array of Transaction model instances',
  //       content: {
  //         'application/json': {
  //           schema: {
  //             type: 'array',
  //             items: getModelSchemaRef(Transaction, { includeRelations: true }),
  //           },
  //         },
  //       },
  //     },
  //   },
  // })
  // async find(
  //   @param.filter(Transaction) filter?: Filter<Transaction>,
  // ): Promise<Transaction[]> {
  //   return this.transactionRepository.find(filter);
  // }

  // @patch('/transactions', {
  //   responses: {
  //     '200': {
  //       description: 'Transaction PATCH success count',
  //       content: { 'application/json': { schema: CountSchema } },
  //     },
  //   },
  // })
  // async updateAll(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Transaction, { partial: true }),
  //       },
  //     },
  //   })
  //   transaction: Transaction,
  //   @param.where(Transaction) where?: Where<Transaction>,
  // ): Promise<Count> {
  //   return this.transactionRepository.updateAll(transaction, where);
  // }

  @authenticate('jwt')
  @get('/transactions/{id}', {
    responses: {
      '200': {
        description: 'Transaction model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Transaction, { includeRelations: true }),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let response = {
      start_time: 0,
      duration: 0,
      numPer: 0,
      email: '',
      phone: '',
      name: '',
      price: 0,
      roomName: '',
      status: '',
      key: '',
      booking_reference: ''
    }
    const transaction = await this.transactionRepository.findById(id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
    if (currentUserProfile[securityId] != transaction.userId && currentUserProfile[securityId] != transaction.room?.coworking?.userId)
      throw new AppResponse(401, 'Access denied')
    const bookings = transaction.bookings;
    let start_date = new Date(bookings[0].date_time.getTime());
    start_date.setHours(bookings[0].start_time);
    let end_date = new Date(bookings[bookings.length - 1].date_time.getTime());
    end_date.setHours(bookings[bookings.length - 1].end_time);
    response.start_time = start_date.getTime();
    response.numPer = bookings[0].numPerson;
    response.name = transaction.user?.client.name as any;
    response.email = transaction.user?.email as any;
    response.phone = transaction.user?.client.phone as any;
    response.price = transaction.price;
    response.roomName = transaction.room?.name as any;
    response.duration = (end_date.getTime() - start_date.getTime()) / 3600000;
    response.status = transaction.status;
    response.booking_reference = transaction.booking_reference;
    if (!transaction.check_in)
      response.key = 'CHECK_IN';
    else if (!transaction.check_out)
      response.key = 'CHECK_OUT';
    return new AppResponse(200, 'Success', response);
  }

  // @patch('/transactions/{id}', {
  //   responses: {
  //     '204': {
  //       description: 'Transaction PATCH success',
  //     },
  //   },
  // })
  // async updateById(
  //   @param.path.string('id') id: string,
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Transaction, { partial: true }),
  //       },
  //     },
  //   })
  //   transaction: Transaction,
  // ): Promise<void> {
  //   await this.transactionRepository.updateById(id, transaction);
  // }

  // @put('/transactions/{id}', {
  //   responses: {
  //     '204': {
  //       description: 'Transaction PUT success',
  //     },
  //   },
  // })
  // async replaceById(
  //   @param.path.string('id') id: string,
  //   @requestBody() transaction: Transaction,
  // ): Promise<void> {
  //   await this.transactionRepository.replaceById(id, transaction);
  // }

  // @del('/transactions/{id}', {
  //   responses: {
  //     '204': {
  //       description: 'Transaction DELETE success',
  //     },
  //   },
  // })
  // async deleteById(@param.path.string('id') id: string): Promise<void> {
  //   await this.transactionRepository.deleteById(id);
  // }
}
