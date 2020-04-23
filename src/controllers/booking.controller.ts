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
  HttpErrors,
} from '@loopback/rest';
import { Booking, Room, Transaction } from '../models';
import { BookingRepository, TransactionRepository, RoomRepository } from '../repositories';
import { authorize } from '@loopback/authorization';
import { authenticate, TokenService } from '@loopback/authentication';
import { TokenServiceBindings } from '../services/key';
import { basicAuthorization } from '../services/basic.authorizor';
import { UserRepository } from '../repositories';
import { inject } from '@loopback/context';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import { AppResponse } from '../services/appresponse';
import { CreateBooking, ValidateBooking, getPrice } from '../services/booking.api';
import { MyDefault } from '../services/mydefault';
import { FireBase } from '../services/firebase';
import { Notification } from '../services/schedule';
import { cDate } from '../services/date';

export class BookingController {
  constructor(
    @repository(TransactionRepository)
    public transactionRepository: TransactionRepository,
    @repository(BookingRepository)
    public bookingRepository: BookingRepository,
    @repository(RoomRepository)
    public roomRepository: RoomRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService
  ) { }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @post('/bookings/price', {
    responses: {
      '200': {
        description: 'Get price of booking',
      },
    },
  })
  async price(
    @requestBody() createBooking: CreateBooking,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let result = await (new ValidateBooking(this.bookingRepository, this.roomRepository)).checkCondition(createBooking, '');
    if (!result.status)
      throw new AppResponse(400, result.message);
    return new AppResponse(200, 'Booking success', { price: await getPrice(this.roomRepository, createBooking) });
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @post('/bookings', {
    responses: {
      '200': {
        description: 'Booking is created',
      },
    },
  })
  async create(
    @requestBody() createBooking: CreateBooking,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let result = await (new ValidateBooking(this.bookingRepository, this.roomRepository)).checkCondition(createBooking, '');
    if (!result.status)
      throw new AppResponse(400, result.message);
    let transaction = new Transaction;
    transaction.status = MyDefault.TRANSACTION_STATUS.PENDING;
    transaction.create_at = new Date();
    transaction.update_at = new Date();
    transaction.check_in = false;
    transaction.check_out = false;
    transaction.roomId = createBooking.room_id;
    transaction.price = await getPrice(this.roomRepository, createBooking);
    transaction.booking_reference = Math.floor(Math.random() * 100000000 + 1) + '';
    while (await this.transactionRepository.findOne({ where: { booking_reference: transaction.booking_reference } }) != undefined)
      transaction.booking_reference = Math.floor(Math.random() * 100000000 + 1) + '';
    transaction = await this.userRepository.transactions(currentUserProfile[securityId]).create(transaction);
    for (var i = 0; i < result.data.length; i++) {
      let booking: any = result.data[i];
      booking = await this.transactionRepository.bookings(transaction.id).create(booking);
      const date: Date = booking.date_time;
      Notification.schedule_booking_on_going(booking.start_time, date, booking.id);
      Notification.schedule_booking_finish(booking.end_time, date, booking.id);
    }
    transaction = await this.transactionRepository.findById(transaction.id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
    const start_time: number = (result.data[0] as any).start_time;
    const start_date: Date = (result.data[0] as any).date_time;
    Notification.NotiSuccess(start_time, start_date, transaction);
    Notification.noti_reminder_check_in(start_time, start_date, 30, transaction.id, transaction.update_at);
    const end_time = (result.data[result.data.length - 1] as any).end_time;
    const end_date = (result.data[result.data.length - 1] as any).date_time;
    Notification.noti_reminder_check_out(end_time, end_date, 30, transaction.id, transaction.update_at);
    Notification.noti_reminder_check_out(end_time, end_date, 5, transaction.id, transaction.update_at);
    Notification.noti_cancel_booking_over_time(end_time, end_date, transaction.id, transaction.update_at);
    Notification.noti_reminder_check_out_over_5(end_time, end_date, transaction.id, transaction.update_at);
    return new AppResponse(200, 'Booking success', { transaction_id: transaction.id });
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @patch('/bookings/{id}', {
    responses: {
      '200': {
        description: 'Edit booking',
      },
    },
  })
  async edit(
    @param.path.string('id') id: string,
    @requestBody() createBooking: CreateBooking,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let result = await (new ValidateBooking(this.bookingRepository, this.roomRepository)).checkCondition(createBooking, id);
    if (!result.status)
      throw new AppResponse(400, result.message);
    let transaction = await this.transactionRepository.findById(id);
    if (transaction.userId != currentUserProfile[securityId])
      throw new AppResponse(401, 'Access denied');
    if (transaction.status == MyDefault.TRANSACTION_STATUS.CANCELLED || transaction.status == MyDefault.TRANSACTION_STATUS.SUCCESS || transaction.check_out)
      throw new AppResponse(400, 'Cannot edit this booking');
    await this.transactionRepository.bookings(id).delete();
    transaction.update_at = new Date();
    transaction.roomId = createBooking.room_id;
    transaction.price = await getPrice(this.roomRepository, createBooking);;
    await this.transactionRepository.update(transaction);
    for (var i = 0; i < result.data.length; i++) {
      let booking: any = result.data[i];
      booking = await this.transactionRepository.bookings(transaction.id).create(booking);
      const date: Date = booking.date_time;
      Notification.schedule_booking_on_going(booking.start_time, date, booking.id);
      Notification.schedule_booking_finish(booking.end_time, date, booking.id);
    }
    transaction = await this.transactionRepository.findById(transaction.id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
    const start_time = (result.data[0] as any).start_time;
    const start_date = (result.data[0] as any).date_time;
    FireBase.sendMulti(transaction.room?.coworking?.user?.firebase_token as any, {
      title: `[Edit Booking] ${transaction.user?.client.name} #${transaction.booking_reference}`,
      body: `Đã đổi đặt phòng thành lúc ${cDate.formatTime(start_time)}h ${cDate.formatDate(start_date)}`
    })
    FireBase.sendMulti(transaction.user?.firebase_token as any, {
      title: `Sửa booking thành công #${transaction.booking_reference}`,
      body: `Bạn đã đặt phòng lúc ${cDate.formatTime(start_time)}h ${cDate.formatDate(start_date)}`
    })
    Notification.noti_reminder_check_in(start_time, start_date, 30, transaction.id, transaction.update_at);
    const end_time = (result.data[result.data.length - 1] as any).end_time;
    const end_date = (result.data[result.data.length - 1] as any).date_time;
    Notification.noti_reminder_check_out(end_time, end_date, 30, transaction.id, transaction.update_at);
    Notification.noti_reminder_check_out(end_time, end_date, 5, transaction.id, transaction.update_at);
    Notification.noti_cancel_booking_over_time(end_time, end_date, transaction.id, transaction.update_at);
    Notification.noti_reminder_check_out_over_5(end_time, end_date, transaction.id, transaction.update_at);
    return new AppResponse(200, 'Edit booking success', { transaction_id: transaction.id });
  }


  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @get('/check-in/{transaction_id}', {
    responses: {
      '200': {
        description: 'Check in',
      },
    },
  })
  async checkin(
    @param.path.string('transaction_id') transaction_id: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let transaction = await this.transactionRepository.findById(transaction_id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
    if (transaction.check_in) throw new AppResponse(400, 'This booking already check in', { key: 'ALREADY_CHECK_IN' });
    if (!transaction.room) throw new AppResponse(400, 'Not found room', { key: 'NOT_FOUND_ROOM' });
    if (currentUserProfile[securityId] != transaction.room.coworking?.userId) throw new AppResponse(401, 'Access denied', { key: 'ACCESS_DENIED' });
    if (transaction.status != MyDefault.TRANSACTION_STATUS.PENDING) throw new AppResponse(400, 'Check in not allow', { key: 'CHECK_IN_NOT_ALLOW' });

    const room = transaction.room;
    const user = transaction.user;
    const bookings = transaction.bookings;

    let end_date = bookings[bookings.length - 1].date_time;
    end_date.setHours(bookings[bookings.length - 1].end_time);
    if (new Date() > end_date) throw new AppResponse(400, 'Time over check-in', { key: 'TIME_OVER' });

    delete transaction.room;
    delete transaction.user;
    delete transaction.bookings;
    transaction.check_in = true;
    transaction.status = MyDefault.TRANSACTION_STATUS.ON_GOING;
    await this.transactionRepository.update(transaction);

    FireBase.sendMulti(room.coworking?.user?.firebase_token as any, {
      title: `[Check-in] ${user?.client.name} đã check-in #${transaction.booking_reference}`,
      body: `Khách hàng đã check-in thành công.`
    })

    FireBase.sendMulti(user?.firebase_token as any, {
      title: `Check-in thành công #${transaction.booking_reference}`,
      body: `Bạn đã check-in thành công`
    })
    return new AppResponse(200, 'Check-in success', { key: 'CHECK_IN_SUCCESS' });
  }

  @authenticate('jwt')
  @get('/bookings/cancel/{transaction_id}', {
    responses: {
      '200': {
        description: 'Check in',
      },
    },
  })
  async cancelBooking(
    @param.path.string('transaction_id') transaction_id: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let transaction = await this.transactionRepository.findById(transaction_id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
    if (!transaction.room) throw new AppResponse(400, 'Not found room', { key: 'NOT_FOUND_ROOM' });
    if (currentUserProfile[securityId] != transaction.room.coworking?.userId && currentUserProfile[securityId] != transaction.userId)
      throw new AppResponse(401, 'Access denied', { key: 'ACCESS_DENIED' });
    if (transaction.status == MyDefault.TRANSACTION_STATUS.CANCELLED)
      throw new AppResponse(400, 'This booking was canceled', { key: 'THIS_BOOKING_CANCELED' });


    const room = transaction.room;
    const user = transaction.user;
    const bookings = transaction.bookings;
    let start_date = bookings[0].date_time;
    start_date.setHours(bookings[0].start_time);
    if (new Date() > start_date)
      throw new AppResponse(400, 'Time over cancel', { key: 'TIME_OVER_CANCEL' });

    delete transaction.room;
    delete transaction.user;
    delete transaction.bookings;
    transaction.status = MyDefault.TRANSACTION_STATUS.CANCELLED;
    transaction.update_at = new Date();
    await this.transactionRepository.bookings(transaction_id).patch({ status: MyDefault.BOOKING_STATUS.CANCELLED });
    await this.transactionRepository.update(transaction);

    FireBase.sendMulti(room.coworking?.user?.firebase_token as any, {
      title: `[Cancel] ${user?.client.name} đã hủy booking #${transaction.booking_reference}`,
      body: `Khách hàng đã booking thành công.`
    })

    FireBase.sendMulti(user?.firebase_token as any, {
      title: `Hủy booking thành công #${transaction.booking_reference}`,
      body: `Bạn đã hủy booking thành công`
    })
    return new AppResponse(200, 'Cancel booking success', { key: 'CANCEL_BOOKING_SUCCESS' });
  }


  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Admin'],
    voters: [basicAuthorization],
  })
  @get('/check-out/{transaction_id}', {
    responses: {
      '200': {
        description: 'Check out',
      },
    },
  })
  async checkout(
    @param.path.string('transaction_id') transaction_id: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let transaction = await this.transactionRepository.findById(transaction_id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
    if (transaction.check_out) throw new AppResponse(400, 'This booking already check in', { key: 'ALREADY_CHECK_OUT' });
    if (!transaction.room) throw new AppResponse(400, 'Not found room', { key: 'NOT_FOUND_ROOM' });
    if (currentUserProfile[securityId] != transaction.room.coworking?.userId) throw new AppResponse(401, 'Access denied', { key: 'ACCESS_DENIED' });
    if (!transaction.check_in) throw new AppResponse(400, 'Require check_in', { key: 'REQUIRE_CHECK_IN' });
    if (transaction.status != MyDefault.TRANSACTION_STATUS.ON_GOING) throw new AppResponse(400, 'Check out not allow', { key: 'CHECK_OUT_NOT_ALLOW' });

    const room = transaction.room;
    const user = transaction.user;
    const bookings = transaction.bookings;

    let end_date = bookings[bookings.length - 1].date_time;
    end_date.setHours(bookings[bookings.length - 1].end_time);
    if (new Date() > end_date) throw new AppResponse(400, 'Time over check-out', { key: 'TIME_OVER' });

    delete transaction.room;
    delete transaction.user;
    delete transaction.bookings;
    transaction.check_out = true;
    transaction.status = MyDefault.TRANSACTION_STATUS.SUCCESS;
    await this.transactionRepository.update(transaction);

    FireBase.sendMulti(room.coworking?.user?.firebase_token as any, {
      title: `[Check-out] ${user?.client.name} đã check-out #${transaction.booking_reference}`,
      body: `Khách hàng đã check-out thành công.`
    })

    FireBase.sendMulti(user?.firebase_token as any, {
      title: `Check-out thành công #${transaction.booking_reference}`,
      body: `Bạn đã check-out thành công`
    })
    transaction.room = room;
    transaction.user = user;
    transaction.bookings = bookings;
    return new AppResponse(200, 'Check-out success', { key: 'CHECK_OUT_SUCCESS' });
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @get('/bookings/history', {
    responses: {
      '200': {
        description: 'Booking history',
      },
    },
  })
  async bookingsHistory(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    let transactionId = (await this.userRepository.transactions(currentUserProfile[securityId]).find()).map(e => e.id);
    let listDate: number[] = [];
    (await this.bookingRepository.find({ where: { transactionId: { inq: transactionId } } })).forEach(e => {
      if (listDate.indexOf(e.date_time.getTime()) == -1)
        listDate.push(e.date_time.getTime());
    });
    return new AppResponse(200, 'Success', listDate);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['Customer'],
    voters: [basicAuthorization],
  })
  @get('/bookings/{date}', {
    responses: {
      '200': {
        description: 'List bookings',
      },
    },
  })
  async bookingsDate(
    @param.path.number('date') date: number,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<AppResponse> {
    if (date == undefined || date <= 0) throw new AppResponse(400, "date invaild");
    let listTransaction: any[] = [];
    let transactions = await this.userRepository.transactions(currentUserProfile[securityId]).find({ include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking' }] } }], });
    transactions.forEach(e => {
      let check = false;
      let item: any = { ...e };
      item.duration = 0;
      e.bookings.forEach(e1 => {
        item.duration += e1.end_time - e1.start_time;
        if (e1.date_time.getTime() == date) {
          check = true;
          item.start_time_date = e1.start_time;
          item.duration_date = e1.end_time - e1.start_time;
        }
      });
      if (check) {
        item.date_time = e.bookings[0].date_time.getTime();
        item.start_time = e.bookings[0].start_time;
        item.numPerson = e.bookings[0].numPerson;
        item.coworking = { ...item.room.coworking };
        listTransaction.push(item);
      }
    });
    listTransaction.forEach(e => {
      delete e.bookings;
      delete e.room.coworking;
    });
    return new AppResponse(200, 'Success', listTransaction);
  }
}
