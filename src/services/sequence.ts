import { inject } from '@loopback/context';
import {
  FindRoute,
  InvokeMethod,
  ParseParams,
  Reject,
  RequestContext,
  RestBindings,
  Send,
  SequenceHandler,
} from '@loopback/rest';
import {
  AuthenticationBindings,
  AuthenticateFn,
  AUTHENTICATION_STRATEGY_NOT_FOUND,
  USER_PROFILE_NOT_FOUND,
} from '@loopback/authentication';
import { AppResponse } from './appresponse';
const SequenceActions = RestBindings.SequenceActions;
const ErrorCode = {
  ENTITY_NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  INVALID_PARAMETER_VALUE: 400,
  MISSING_REQUIRED_PARAMETER: 400
}

export class MyAuthenticationSequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS)
    protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) protected send: Send,
    @inject(SequenceActions.REJECT) protected reject: Reject,
    @inject(AuthenticationBindings.AUTH_ACTION)
    protected authenticateRequest: AuthenticateFn,
  ) { }

  async handle(context: RequestContext) {
    try {
      const { request, response } = context;
      const route = this.findRoute(request);

      //call authentication action
      await this.authenticateRequest(request);

      // Authentication successful, proceed to invoke controller
      const args = await this.parseParams(request, route);
      const result = await this.invoke(route, args);

      if (result != undefined && result.code != undefined)
        response.statusCode = result.code;
      this.send(response, result);
    } catch (err) {
      let message, statusCode;
      const { response } = context;
      if (err.code != undefined && typeof (err.code) == 'string') {
        statusCode = (ErrorCode as any)[err.code] == undefined ? 500 : (ErrorCode as any)[err.code];
        message = err.code;
      }
      else if (err.code != undefined && typeof (err.code) == 'number' && err.code <= 500) {
        response.statusCode = err.code;
        this.send(response, err);
        console.log(err);
        return;
      } else if (err.message != undefined) {
        statusCode = 400;
        message = err.message;
      }
      if (statusCode == 500) {
        message = 'Internal Server Error'
        console.log(err);
      }
      response.statusCode = statusCode;
      this.send(response, new AppResponse(statusCode, message));
      return;
    }
  }
}
