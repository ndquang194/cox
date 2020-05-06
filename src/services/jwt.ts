import { inject } from '@loopback/context';
import { HttpErrors } from '@loopback/rest';
import { promisify } from 'util';
import { TokenService } from '@loopback/authentication';
import { UserProfile, securityId } from '@loopback/security';
import { TokenServiceBindings } from './key';
import { AppResponse } from './appresponse';

const jwt = require('jsonwebtoken');
const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

export class JWTService implements TokenService {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SECRET)
    private jwtSecret: string,
    @inject(TokenServiceBindings.TOKEN_EXPIRES_IN)
    private jwtExpiresIn: string,
  ) { }

  async verifyToken(token: string): Promise<UserProfile> {
    if (!token) {
      throw new AppResponse(401, `Error verifying token : 'token' is null`);
    }

    let userProfile: UserProfile;

    try {
      // decode user profile from token
      const decodedToken = await verifyAsync(token, this.jwtSecret);
      userProfile = Object.assign(
        { [securityId]: '', email: '' },
        {
          [securityId]: decodedToken.id,
          id: decodedToken.id,
          email: decodedToken.email,
          typeUser: decodedToken.typeUser,
        },
      );
    } catch (error) {
      throw new AppResponse(401, `Error verifying token : ${error.message}`);
    }
    return userProfile;
  }

  async generateToken(userProfile: UserProfile): Promise<string> {
    if (!userProfile) {
      throw new AppResponse(401, 'Error generating token : userProfile is null');
    }
    const userInfoForToken = {
      id: userProfile[securityId],
      email: userProfile.email,
      typeUser: userProfile.typeUser,
    };
    // Generate a JSON Web Token
    let token: string;
    try {
      token = await signAsync(userInfoForToken, this.jwtSecret, {
        expiresIn: Number(this.jwtExpiresIn),
      });
    } catch (error) {
      throw new AppResponse(401, `Error encoding token : ${error}`);
    }

    return token;
  }
}
