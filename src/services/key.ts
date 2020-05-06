import { BindingKey } from '@loopback/context';
import { BcryptHasher } from './hash.password';
import { TokenService, UserService } from '@loopback/authentication';
import { User } from '../models';
import { Credentials } from '../repositories';
const path = require('path');

const unicode = [
  "aAàÀảẢãÃáÁạẠăĂằẰẳẲẵẴắẮặẶâÂầẦẩẨẫẪấẤậẬ",
  "bB",
  "cC",
  "dDđĐ",
  "eEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆ",
  "fF",
  "gG",
  "hH",
  "iIìÌỉỈĩĨíÍịỊ",
  "jJ",
  "kK",
  "lL",
  "mM",
  "nN",
  "oOòÒỏỎõÕóÓọỌôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢ",
  "pP",
  "qQ",
  "rR",
  "sS",
  "tT",
  "uUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰ",
  "vV",
  "wW",
  "xX",
  "yYỳỲỷỶỹỸýÝỵỴ",
  "zZ"
]

export namespace TokenServiceConstants {
  export const TOKEN_SECRET_VALUE = 'myjwts3cr3t';
  export const TOKEN_EXPIRES_IN_VALUE = '' + 10 * 365 * 24 * 60 * 60;
}

export namespace TokenServiceBindings {
  export const TOKEN_SECRET = BindingKey.create<string>(
    'authentication.jwt.secret',
  );
  export const TOKEN_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.expires.in.seconds',
  );
  export const TOKEN_SERVICE = BindingKey.create<TokenService>(
    'services.authentication.jwt.tokenservice',
  );
}

export namespace PasswordHasherBindings {
  export const PASSWORD_HASHER = BindingKey.create<BcryptHasher>(
    'services.hasher',
  );
  export const ROUNDS = BindingKey.create<number>('services.hasher.round');
}

export namespace UserServiceBindings {
  export const USER_SERVICE = BindingKey.create<UserService<User, Credentials>>(
    'services.user.service',
  );
}

export namespace EmailConfig {
  export const user = 'coex.register@gmail.com';
  export const pass = 'bsyfxsddogqktqpd';
}

export namespace Path {
  export const root = path.join(__dirname, '../../public/');
  export const images = 'images';
}

export const CoinServer = 'http://dev.coinserver.unox.site';
export const PointToCoin = 20000;
export const MoneyToCoin = 1000;

export function unicodeToAscii(str: string) {
  const strArr = str.split('');
  for (let i = 0; i < str.length; i++) {
    let char = unicode.find(x => { return x.includes(str[i]) });
    if (char != undefined) {
      strArr.splice(i, 1, `[${char}]`);
    }
  }
  return strArr.join('');
}
