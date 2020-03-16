import { genSalt, hash } from 'bcryptjs';
import { compare } from 'bcryptjs';
import { inject } from '@loopback/core';
import { PasswordHasherBindings } from './key';


export class BcryptHasher {
  constructor(
    @inject(PasswordHasherBindings.ROUNDS)
    private readonly rounds: number) {
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await genSalt(this.rounds);
    return hash(password, salt);
  }

  async comparePassword(
    providedPass: string,
    storedPass: string,
  ): Promise<boolean> {
    const passwordIsMatched = await compare(providedPass, storedPass);
    return passwordIsMatched;
  }
}
