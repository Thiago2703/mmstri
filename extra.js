/**
 * npm module deps
 */
 const express = require('express');
 const { File } = require('megajs');
 
 
 // Listen on a specific host via the HOST environment variable
 var host = process.env.HOST || '0.0.0.0';
 // Listen on a specific port via the PORT environment variable
 var port = process.env.PORT || 8000;
 const file = File.fromURL('https://mega.nz/file/WxdTnDYA#FM9G2f1m_IyusoOFtGD3z7R7Y6HSYw_vrhklzYXGI1Y', {urls: ['https://download203df.herokuapp.com/']});
 var files = [];
 /**
  * local deps
  */
 const { createError, log } = require('./helpers');
 const middlewares = require('./middleware');
 
 /**
  * bootstrap express app
  */
 const app = new express();
 
 /**
  * various things 
  */
 const baseMega = 'https://mega.nz/#';
 
 /**
  * helpers
  */
 const genFolderJSON = (req, folder, child) => {
   return folder.map((file, i) => {
     if (file.directory) {
       return {
         name: file.attributes.n,
         children: genFolderJSON(req, file.children, i)
       }
     } else {
       return {
         name: file.attributes.n,
         streamableLink: `${genFullURL(req)}/${child ? child + '/' : ''}${i}`
       }
     }
   })
 }
 
 const genHeaders = (start, end, fileSize, chunkSize) => {
   return {
     'Content-Range': `bytes ${start}-${end}/${fileSize}`,
     'Accept-Range': 'bytes',
     'Content-Length': chunkSize,
     'Content-Type': 'video/x-matroska'
   }
 }
 
 const genFullURL = (req) => { return req.protocol + '://' + req.get('host') + req.originalUrl }
 
 /**
  * init some vars
  */
 let currentStream;
 let currentReq = 0;
 let lastReq = 0;
 let isStreaming = false;
 
 /**
  * handle streaming individual files from mega
  * TODO: Handle multiple streams possibly
  */
 
 app.get('/stream/:link?', async (req, res) => {
   
   if(!req.params.link) return res.status(404).send('Not found');
   if(req.params.link.includes('&&&')){
     
   
   var url = req.params.link.split('&&&');
 
   if(!files[url[0]]){
     let file = File.fromURL(`https://mega.nz/file/${url[0]}#${url[1]}`, {urls: ['https://download203df.herokuapp.com/']});
     //console.log(`https://mega.nz/file/${url[0]}#${url[1]}`)
     let file_data = await file.loadAttributes();
     files[url[0]] = {
       f: file,
       s: file_data.size,
       n: file_data.name
     }
   }
   //console.log(files)
   /**/
   let fileSize = null;
 
   // init requests interval var
   let streamTimer;
 
   // increment current requests
   currentReq++;
 
   // close event handler
   req.on('close', () => {
     if (lastReq == currentReq) {
       log(`Stopping playback of ${currentStream}`);
       currentStream = '';
       isStreaming = false;
       currentReq = 0;
       lastReq = 0;
       files[url[0]] = null;
     }
 
     lastReq = currentReq;
   })
   
   
   //files[url[0]].file.loadAttributes((err, data) => {
     
     //if (err) res.writeHead(500).send(err);
     //console.log('yuoppp')
     // Handle current stream
     let name = files[url[0]].n;
     if (currentStream !== name) {
       log(`Streaming ${name} to ${req.headers['user-agent']} via ${req.protocol}`);
       currentStream = name;
     }
 
     // Assign true filesize from mega file
     fileSize = files[url[0]].s;
     
     const range = req.headers.range;
     //console.log('fileSize',fileSize)
     if (range) {
       console.log(range);
       const parts = range.replace(/bytes=/, '').split('-');
 
     
       const start = parseInt(parts[0], 10);
       const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
       /*
       let calcu = start+(1024*1024*50); 
       if(calcu>(fileSize-1)){
         end = fileSize-1
       }else{
         end = calcu;
       }*/
   /*
       let start;
       let end;
       
       if(parts[0]==='0'){
         start = 0;
         end = 340651;
         yt = true;
       }else if(yt){
         start = parseInt(parts[0], 10);
         end = fileSize - 1;
         yt = false;
       }else{
         start = parseInt(parts[0], 10);
         end = start + 128*1024
       }*/
       const chunkSize = (end - start) + 1;
       
       //res.writeHead(206, genHeaders(start, end, fileSize, chunkSize));
       res.set(genHeaders(start, end, fileSize, chunkSize));
       res.status(206);
       
       const dlPipe = file.download({start, end, maxConnections: 4});
       
       // create 5 second interval to watch for stream end
       streamTimer = setInterval(() => {
         if (!isStreaming) {
           dlPipe.emit('close');
           clearInterval(streamTimer);
         }
       }, 5000);
       
       dlPipe.pipe(res);
 
     } else {
       console.log('evaaaaaaaaaaaa')
       const head = {
         'Content-Length': fileSize,
         //'type': 'video/mp4'
       };
       res.writeHead(206, head);
       file.download({start: 0, end: 1024 * 1024, maxConnections: 1}).pipe(res);
     }
 
     isStreaming = true;
   //})
   }else{
     res.status(404).send('Not found');
   }
   
 
 })
 
 /**
  * barebones api for folders
  * TODO: make this actually work
  */
 app.get('/folder/:link?', function (req, res, next) {
   if (req.params.link === undefined) return next(createError(404, "No link provided"));
   const folder = File.fromURL(baseMega + req.params.link)
   
   if (req.params.child === undefined) {
 
     folder.loadAttributes((err, data) => {
       res.json(genFolderJSON(req, data.children))
       /*res.json(data.children.map((f, i) => {
         console.log(f.children)
         if (f.directory) {
           return {
             name: f.attributes.n,
             children: f.children.map()
           }
         } else {
           return {
             name: f.attributes.n,
             streamableLink: `${genFullURL(req)}/${i}`
           }
         }
       }))*/
     })
   } 
 })
 
 /**
  * load all middlewares
  */
 
 for (let middleware in middlewares) {
   app.use(middlewares[middleware]);
 }
 
 // TODO: allow server config
 app.listen(port, host, function() {
   console.log('MEGA streaming on ' + host + ':' + port);
 });
 