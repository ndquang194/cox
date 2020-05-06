import { TransactionRepository, RoomRepository, UserRepository, BookingRepository } from "../repositories";
import { FireBase } from '../services/firebase';
import { cDate } from '../services/date'
import { MyDefault } from "./mydefault";
import { MoneyToCoin } from "./key";

export class Notification {
  //Noti Book thành công
  public static async NotiSuccess(start_time: number, date_time: Date, transaction: any) {
    FireBase.sendMulti(transaction.room.coworking?.user?.firebase_token as any, {
      title: `[New Booking] ${transaction.user.client.name} #${transaction.booking_reference}`,
      body: `Have new booking at ${cDate.formatTime(start_time)}h ${cDate.formatDate(date_time)}`
    })
    FireBase.sendMulti(transaction.user.firebase_token, {
      title: `Booking successfully`,
      body: `You have requested booking successfully at ${cDate.formatTime(start_time)}h ${cDate.formatDate(date_time)}`
    })
  }

  //Noti Edit thành công
  public static async NotiUpdateSuccess(start_time: number, date_time: Date, transaction: any) {
    FireBase.sendMulti(transaction.room.coworking?.user?.firebase_token as any, {
      title: `[Edit Booking] ${transaction.user.client.name} #${transaction.booking_reference}`,
      body: `Booking at  ${cDate.formatTime(start_time)}h ${cDate.formatDate(date_time)}`
    })
    FireBase.sendMulti(transaction.user.firebase_token, {
      title: `Edit booking successfully`,
      body: `You have booking at ${cDate.formatTime(start_time)}h ${cDate.formatDate(date_time)}`
    })
  }

  //Noti Nhắc nhở check-in
  public static noti_reminder_check_in(start_time: number, date: Date, time: number, transactionId: string, update_at: Date) {
    let date_time = new Date(date.getTime());
    date_time.setHours(start_time);
    Schedule.agenda.schedule(new Date(date_time.getTime() - time * 60000), 'noti_reminder_check_in', { id: transactionId, update_at: update_at });
  }

  //Noti Nhắc nhở check-out
  public static noti_reminder_check_out(start_time: number, date: Date, time: number, transactionId: string, update_at: Date) {
    let date_time = new Date(date.getTime());
    date_time.setHours(start_time);
    Schedule.agenda.schedule(new Date(date_time.getTime() - time * 60000), 'noti_reminder_check_out', { id: transactionId, time: time, update_at: update_at });
  }

  //Noti Nhắc nhở quá thời gian
  public static noti_reminder_check_out_over_5(start_time: number, date: Date, transactionId: string, update_at: Date) {
    let date_time = new Date(date.getTime());
    date_time.setHours(start_time);
    Schedule.agenda.schedule(new Date(date_time.getTime() + 5 * 60000), 'noti_reminder_check_out_over_5', { id: transactionId, update_at: update_at });
  }

  public static noti_cancel_booking_over_time(start_time: number, date: Date, transactionId: string, update_at: Date) {
    let date_time = new Date(date.getTime());
    date_time.setHours(start_time);
    Schedule.agenda.schedule(date_time, 'noti_cancel_booking_over_time', { id: transactionId, update_at: update_at });
  }

  public static schedule_booking_on_going(start_time: number, date: Date, bookingId: string) {
    let date_time = new Date(date.getTime());
    date_time.setHours(start_time);
    Schedule.agenda.schedule(date_time, 'schedule_booking_on_going', { id: bookingId });
  }

  //Lập lịch chuyển trạng thái booking finish
  public static schedule_booking_finish(start_time: number, date: Date, bookingId: string) {
    let date_time = new Date(date.getTime());
    date_time.setHours(start_time);
    Schedule.agenda.schedule(date_time, 'schedule_booking_finish', { id: bookingId });
  }

}


export class Schedule {
  public static agenda: any;

  constructor(
    public transactionRepository: TransactionRepository,
    public bookingRepository: BookingRepository,
    public userRepository: UserRepository
  ) {
  }

  //Noti Nhắc nhở check-in
  public async define() {
    var self = this;
    Schedule.agenda.define('noti_reminder_check_in', async (job: any) => {
      const data = job.attrs.data;
      const atransaction = await self.transactionRepository.findById(data.id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
      if (!atransaction || atransaction.check_in || atransaction.status == MyDefault.TRANSACTION_STATUS.CANCELLED || data.update_at.getTime() != atransaction.update_at.getTime()) return;
      FireBase.sendMulti(atransaction.room?.coworking?.user?.firebase_token as any, {
        title: `[Reminder] Incomming booking ` + (atransaction.check_in ? '' : 'check-in ') + `#${atransaction.booking_reference}`,
        body: `Please prepare to receive customer ` + (atransaction.check_in ? '' : 'check-in ') + `at ${cDate.formatTime(atransaction.bookings[0].start_time)}h ${cDate.formatDate(atransaction.bookings[0].date_time as Date)}`
      })
      FireBase.sendMulti(atransaction.user?.firebase_token as any, {
        title: `Incomming booking ` + (atransaction.check_in ? '' : 'check-in ') + `booking #${atransaction.booking_reference}`,
        body: `You have an booking in ${atransaction.room?.coworking?.name} at ${cDate.formatTime(atransaction.bookings[0].start_time)}h ${cDate.formatDate(atransaction.bookings[0].date_time as Date)}`
      })
    });

    //Noti Nhắc nhở check-out
    Schedule.agenda.define('noti_reminder_check_out', async (job: any) => {
      const data = job.attrs.data;
      const atransaction: any = await self.transactionRepository.findById(data.id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
      if (!atransaction || atransaction.check_out || atransaction.status == MyDefault.TRANSACTION_STATUS.CANCELLED || data.update_at.getTime() != atransaction.update_at.getTime()) return;
      FireBase.sendMulti(atransaction.room.coworking?.user?.firebase_token as any, {
        title: `[Reminder] Incomming check-out #${atransaction.booking_reference}`,
        body: `${data.time} minutes to check-out booking`
      })
      FireBase.sendMulti(atransaction.user.firebase_token, {
        title: `Incomming check-out`,
        body: `${data.time} minutes to check-out booking #${atransaction.booking_reference}`
      });
    });

    //Noti Nhắc nhở quá thời gian
    Schedule.agenda.define('noti_reminder_check_out_over_5', async (job: any) => {
      const data = job.attrs.data;
      const atransaction: any = await self.transactionRepository.findById(data.id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
      if (!atransaction || atransaction.check_out || atransaction.status == MyDefault.TRANSACTION_STATUS.CANCELLED || data.update_at.getTime() != atransaction.update_at.getTime()) return;
      FireBase.sendMulti(atransaction.room.coworking?.user?.firebase_token as any, {
        title: `[Reminder] Overtime booking #${atransaction.booking_reference}`,
        body: `Booking #${atransaction.booking_reference} check-out overtime`
      })
    });

    //Noti hủy booking
    Schedule.agenda.define('noti_cancel_booking_over_time', async (job: any) => {
      const data = job.attrs.data;
      const atransaction: any = await self.transactionRepository.findById(data.id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
      if (!atransaction || data.update_at.getTime() != atransaction.update_at.getTime()) return;
      if (atransaction.check_in) {
        atransaction.status = MyDefault.TRANSACTION_STATUS.SUCCESS;
        let user = await self.userRepository.findById(atransaction.userId);
        user.list_exchange_point?.push({ createAt: new Date(), point: parseInt((atransaction.price / MoneyToCoin) + '') })
        user.point += parseInt((atransaction.price / MoneyToCoin) + '');
        await self.userRepository.update(user);
        FireBase.sendMulti(user.firebase_token, {
          title: `Thưởng point #${atransaction.booking_reference}`,
          body: `Bạn được thưởng ${parseInt((atransaction.price / MoneyToCoin) + '')} cho booking #${atransaction.booking_reference}`
        })
      } else {
        atransaction.status = MyDefault.TRANSACTION_STATUS.CANCELLED;
        self.transactionRepository.bookings(atransaction.id).patch({ status: MyDefault.BOOKING_STATUS.CANCELLED })
        FireBase.sendMulti(atransaction.room.coworking?.user?.firebase_token as any, {
          title: `[Cancel booking] Cacncel booking #${atransaction.booking_reference}`,
          body: `Booking #${atransaction.booking_reference} is canceled due to overtime`
        })
        FireBase.sendMulti(atransaction.user.firebase_token, {
          title: `Your booking canceled #${atransaction.booking_reference}`,
          body: `Booking #${atransaction.booking_reference} is canceled due to overtime`
        })
      }
      delete atransaction.room;
      delete atransaction.user;
      delete atransaction.bookings;
      self.transactionRepository.update(atransaction);
    });


    Schedule.agenda.define('schedule_booking_on_going', async (job: any) => {
      const data = job.attrs.data;
      let abooking = await self.bookingRepository.findById(data.id);
      if (!abooking || abooking.status != MyDefault.BOOKING_STATUS.PENDING) return;
      abooking.status = MyDefault.BOOKING_STATUS.ON_GOING;
      self.bookingRepository.update(abooking);
    });

    Schedule.agenda.define('schedule_booking_finish', async (job: any) => {
      const data = job.attrs.data;
      let abooking = await self.bookingRepository.findById(data.id, { include: [{ relation: 'transaction' }] });
      if (!abooking || abooking.status != MyDefault.BOOKING_STATUS.ON_GOING || !abooking.transaction?.check_in) return;
      abooking.status = MyDefault.BOOKING_STATUS.FINISH;
      delete abooking.transaction;
      self.bookingRepository.update(abooking);
    });

  }
}
