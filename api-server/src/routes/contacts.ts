import { Router, type RequestHandler } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validateBody, validateParams } from '../middlewares/validation.js';
import { createResponse } from '../utils/response.js';
import { ContactAuthorizationDeniedError, ContactAuthorizationService } from '../services/contact-authorization-service.js';
import { contactRequestBodySchema, contactRequestParamsSchema, noContactRequestBodySchema } from '../validators/contact-authorization.js';

export function createContactRouter(service=new ContactAuthorizationService()){
  const router=Router();
  const run=(handler:(actorId:string,requestId:string)=>Promise<unknown>):RequestHandler=>async(req,res)=>{
    const actorId=req.user?.id;
    if(!actorId)return res.status(401).json(createResponse('Authentication required',null,{},['Unauthorized']));
    try{return res.status(200).json(createResponse('Contact request updated',await handler(actorId,String(req.params.requestId??''))));}
    catch(error){if(error instanceof ContactAuthorizationDeniedError)return res.status(403).json(createResponse(error.message,null,{},[error.code]));throw error;}
  };
  router.get('/contacts/requests',authenticate,async(req,res)=>res.status(200).json(createResponse('Contact requests loaded',await service.listContactRequests(req.user!.id))));
  router.post('/contacts/requests',authenticate,validateBody(contactRequestBodySchema),async(req,res)=>{
    try{return res.status(201).json(createResponse('Contact request sent',await service.requestContact(req.user!.id,req.body.recipientId)));}
    catch(error){if(error instanceof ContactAuthorizationDeniedError)return res.status(403).json(createResponse(error.message,null,{},[error.code]));throw error;}
  });
  router.post('/contacts/requests/:requestId/accept',authenticate,validateParams(contactRequestParamsSchema),validateBody(noContactRequestBodySchema),run((actorId,requestId)=>service.acceptContact(requestId,actorId)));
  router.post('/contacts/requests/:requestId/reject',authenticate,validateParams(contactRequestParamsSchema),validateBody(noContactRequestBodySchema),run((actorId,requestId)=>service.rejectContact(requestId,actorId)));
  router.post('/contacts/requests/:requestId/guardian-approval',authenticate,validateParams(contactRequestParamsSchema),validateBody(noContactRequestBodySchema),run((actorId,requestId)=>service.approveChildContact(requestId,actorId)));
  router.delete('/contacts/requests/:requestId',authenticate,validateParams(contactRequestParamsSchema),run(async(actorId,requestId)=>{await service.withdrawContact(requestId,actorId);return null;}));
  return router;
}
export default createContactRouter();
