import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { MediaService, mediaError, MediaLifecycleError } from '../services/media-service.js';
import { upload } from '../middlewares/upload.js';
import { authenticate } from '../middlewares/auth.js';
import { createResponse } from '../utils/response.js';
import { mediaRateLimiter } from '../middlewares/rate-limit.js';
import { MediaDeliveryService } from '../services/media-delivery.js';

const prepare=z.object({filename:z.string().trim().min(1).max(255),mimeType:z.string().min(1).max(80),size:z.number(),purpose:z.string().min(1).max(50)}).strict();
const empty=z.object({}).strict();
const fail=(res:Response,error:unknown)=>{const value=mediaError(error);res.status(value.status).json(createResponse(value.message,null,{},[value.code]));};
export function createMediaRouter(service=new MediaService(),delivery=new MediaDeliveryService()):Router {
  const router=Router();
  router.get('/media/:id/content',async(req:Request,res:Response)=>{
    try{
      if(typeof req.query.token!=='string')throw new MediaLifecycleError('Media delivery grant is required',403,'media_delivery_denied');
      const content=await delivery.read(req.params.id as string,req.query.token);
      res.setHeader('Content-Type',content.mime);res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Disposition','inline');
      res.setHeader('Accept-Ranges','bytes');
      // Browser audio/video seeking stays bounded to the already verified buffer.
      const range=req.headers.range;
      if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);
        let start=0,end=content.buffer.length-1;
        if(!match||(!match[1]&&!match[2])){res.status(416).end();return;}
        if(!match[1])start=Math.max(0,content.buffer.length-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=content.buffer.length){res.status(416).end();return;}
        res.status(206).setHeader('Content-Range',`bytes ${start}-${end}/${content.buffer.length}`);res.send(content.buffer.subarray(start,end+1));return;
      }
      res.status(200).send(content.buffer);
    }catch(error){fail(res,error);}
  });
  router.post('/media/presign',authenticate,mediaRateLimiter,async(req:Request,res:Response)=>{
    const input=prepare.safeParse(req.body);
    if(!input.success){res.status(400).json(createResponse('Filename, MIME type, size and purpose are required',null,{},['invalid_input']));return;}
    try{res.status(200).json(createResponse('Media upload requested',await service.prepareUpload(req.user!.id,input.data)));}catch(error){fail(res,error);}
  });
  router.post('/media/:id/upload',authenticate,mediaRateLimiter,upload.single('file'),async(req:Request,res:Response)=>{
    try{
      if(!req.file)throw new MediaLifecycleError('No file provided',400,'file_required');
      if(Object.keys(req.body??{}).length)throw new MediaLifecycleError('Provider identity is server-owned',400,'invalid_input');
      res.status(200).json(createResponse('Media uploaded; verification is required',await service.upload(req.user!.id,req.params.id as string,req.file)));
    }catch(error){fail(res,error);}
  });
  router.post('/media/:id/finalize',authenticate,mediaRateLimiter,async(req:Request,res:Response)=>{
    if(!empty.safeParse(req.body??{}).success){res.status(400).json(createResponse('Finalize accepts only the media ID',null,{},['invalid_input']));return;}
    try{
      const result=await service.finalizeUpload(req.user!.id,req.params.id as string);
      const busy=['pending','uploaded','verifying'].includes(result.status);
      res.status(busy?202:200).json(createResponse(busy?'Media verification is in progress':'Media verification completed',result));
    }catch(error){fail(res,error);}
  });
  router.delete('/media/:id',authenticate,mediaRateLimiter,async(req:Request,res:Response)=>{
    try{await service.deleteUpload(req.user!.id,req.params.id as string);res.status(200).json(createResponse('Media deletion scheduled',null));}catch(error){fail(res,error);}
  });
  router.post('/media/upload',authenticate,mediaRateLimiter,upload.single('file'),async(req:Request,res:Response)=>{
    try{
      if(!req.file)throw new MediaLifecycleError('No file provided',400,'file_required');
      if(typeof req.body?.purpose!=='string'||Object.keys(req.body).some(key=>key!=='purpose'))throw new MediaLifecycleError('An explicit media purpose is required',400,'invalid_media_purpose');
      const result=await service.processUpload(req.user!.id,req.file,req.body.purpose);
      res.status(result.status==='approved'?201:200).json(createResponse('Media verification completed',result));
    }catch(error){fail(res,error);}
  });
  router.get('/media/:id/hls',(_req:Request,res:Response)=>{res.status(501).json(createResponse('Adaptive HLS streaming is not enabled in this deployment',null,{},['hls_not_configured']));});
  return router;
}
export default createMediaRouter();
