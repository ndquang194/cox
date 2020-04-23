import { Room, User, Transaction } from "../models";
import { TransactionRepository, RoomRepository, UserRepository, BookingRepository } from "../repositories";
import { FireBase } from '../services/firebase';
import { cDate } from '../services/date'
import { MyDefault } from "./mydefault";
import { repository } from "@loopback/repository";

export class Notification {
  //Noti Book thành công
  public static async NotiSuccess(start_time: number, date_time: Date, transaction: any) {
    FireBase.sendMulti(transaction.room.coworking?.user?.firebase_token as any, {
      title: `[New Booking] ${transaction.user.client.name} #${transaction.booking_reference}`,
      body: `Đặt phòng lúc ${cDate.formatTime(start_time)}h ${cDate.formatDate(date_time)}`
    })
    FireBase.sendMulti(transaction.user.firebase_token, {
      title: `Đặt phòng thành công`,
      body: `Bạn đã đặt phòng lúc ${cDate.formatTime(start_time)}h ${cDate.formatDate(date_time)}`
    })
  }

  //Noti Book thành công
  public static async NotiUpdateSuccess(start_time: number, date_time: Date, transaction: any) {
    FireBase.sendMulti(transaction.room.coworking?.user?.firebase_token as any, {
      title: `[Edit Booking] ${transaction.user.client.name} #${transaction.booking_reference}`,
      body: `Đặt phòng lúc ${cDate.formatTime(start_time)}h ${cDate.formatDate(date_time)}`
    })
    FireBase.sendMulti(transaction.user.firebase_token, {
      title: `Chỉnh sửa đặt phòng thành công`,
      body: `Bạn đã đặt phòng lúc ${cDate.formatTime(start_time)}h ${cDate.formatDate(date_time)}`
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
    public bookingRepository: BookingRepository
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
        title: `[Reminder] Sắp đến giờ ` + (atransaction.check_in ? '' : 'check-in ') + `#${atransaction.booking_reference}`,
        body: `Vui lòng đón khách ` + (atransaction.check_in ? '' : 'check-in ') + `lúc ${cDate.formatTime(atransaction.bookings[0].start_time)}h ${cDate.formatDate(atransaction.bookings[0].date_time as Date)}`
      })
      FireBase.sendMulti(atransaction.user?.firebase_token as any, {
        title: `Sắp đến giờ ` + (atransaction.check_in ? '' : 'check-in ') + `booking #${atransaction.booking_reference}`,
        body: `Bạn có đặt phòng tại ${atransaction.room?.coworking?.name} lúc ${cDate.formatTime(atransaction.bookings[0].start_time)}h ${cDate.formatDate(atransaction.bookings[0].date_time as Date)}`
      })
    });

    //Noti Nhắc nhở check-out
    Schedule.agenda.define('noti_reminder_check_out', async (job: any) => {
      const data = job.attrs.data;
      const atransaction: any = await self.transactionRepository.findById(data.id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
      if (!atransaction || atransaction.check_out || atransaction.status == MyDefault.TRANSACTION_STATUS.CANCELLED || data.update_at.getTime() != atransaction.update_at.getTime()) return;
      FireBase.sendMulti(atransaction.room.coworking?.user?.firebase_token as any, {
        title: `[Reminder] Sắp đến giờ check-out #${atransaction.booking_reference}`,
        body: `Khách hàng sẽ check-out sau ${data.time} phút`
      })
      FireBase.sendMulti(atransaction.user.firebase_token, {
        title: `Sắp đến thời gian check-out`,
        body: `Còn ${data.time} phút nữa sẽ đến thời gian check-out.`
      });
    });

    //Noti Nhắc nhở quá thời gian
    Schedule.agenda.define('noti_reminder_check_out_over_5', async (job: any) => {
      const data = job.attrs.data;
      const atransaction: any = await self.transactionRepository.findById(data.id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
      if (!atransaction || atransaction.check_out || atransaction.status == MyDefault.TRANSACTION_STATUS.CANCELLED || data.update_at.getTime() != atransaction.update_at.getTime()) return;
      FireBase.sendMulti(atransaction.room.coworking?.user?.firebase_token as any, {
        title: `[Reminder] Booking quá thời gian check-out #${atransaction.booking_reference}`,
        body: `Khách hàng đã quá thời gian check-out 5 phút`
      })
    });

    //Noti hủy booking
    Schedule.agenda.define('noti_cancel_booking_over_time', async (job: any) => {
      const data = job.attrs.data;
      const atransaction: any = await self.transactionRepository.findById(data.id, { include: [{ relation: 'bookings' }, { relation: 'room', scope: { include: [{ relation: 'coworking', scope: { include: [{ relation: 'user' }] } }] } }, { relation: 'user' }] });
      if (!atransaction || atransaction.check_out || data.update_at.getTime() != atransaction.update_at.getTime()) return;
      atransaction.status = MyDefault.TRANSACTION_STATUS.CANCELLED;
      self.transactionRepository.bookings(atransaction.id).patch({ status: MyDefault.BOOKING_STATUS.CANCELLED })
      FireBase.sendMulti(atransaction.room.coworking?.user?.firebase_token as any, {
        title: `[Cancel booking] Đã hủy booking #${atransaction.booking_reference}`,
        body: `Khách hàng không check-in trong thời gian đặt phòng`
      })
      FireBase.sendMulti(atransaction.user.firebase_token, {
        title: `Đã hủy booking #${atransaction.booking_reference}`,
        body: `Booking #${atransaction.booking_reference} đã được hủy do quá thời gian check-in`
      })
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
