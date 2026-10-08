import express, { type RequestHandler } from 'express';
import { createResponse } from '../utils/response.js';

/** Keep provider bytes out of generic JSON/form parser errors and logs. */
export function skipAssuranceCallbackParser(parser: RequestHandler): RequestHandler {
  return (req,res,next) => /(?:^|\/)eligibility\/provider\/callback\/?$/.test(req.path) ? next() : parser(req,res,next);
}
const raw = express.raw({ type: () => true,limit: '64kb',inflate: false });
export const assuranceCallbackBody: RequestHandler = (req,res,next) => raw(req,res,error => {
  if (error) { res.status(400).json(createResponse('Verification rejected',null,{},['verification_rejected'])); return; }
  next();
});
