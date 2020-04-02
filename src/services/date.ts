export class cDate {
  static formatDate(date: Date) {
    return `${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}/${date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)}/${date.getFullYear()}`
  }
  static formatTime(time: Number) {
    return `${time < 10 ? '0' + time : time}`;
  }
}
