/**
 * npm module deps
 */
const express = require('express');
const delay = require('delay');
const axios = require('axios');
var crypto = require('crypto');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

const protonmail = require('mail-proton-api');
const cheerio = require('cheerio');
const useProxy = require('puppeteer-page-proxy');
var randomWords = require('random-words');
const name_list = fs.readFileSync(path.join(__dirname, 'name_list.txt')).toString().replace(/\r\n/g, '\n').split('\n');
const proxies = fs.readFileSync(path.join(__dirname, 'proxies.txt')).toString().replace(/\r\n/g, '\n').split('\n');
var UA = require('user-agents');
var httpsProxyAgent = require('https-proxy-agent');

var host = process.env.HOST || '0.0.0.0';
var port = process.env.PORT || 8000;

const puppeteer = require('puppeteer');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteerS = addExtra(puppeteer);
const stealth = StealthPlugin();
puppeteerS.use(stealth);


/**
 * helps
 */
function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
/**
 * local deps
 */
const { createError, log } = require('./helpers');
const middlewares = require('./middleware');
const { del } = require('express/lib/application');

/**
 * bootstrap express app
 */
const app = new express();

const extendTimeoutMiddleware = (req, res, next) => {
  const space = ' ';
  let isFinished = false;
  let isDataSent = false;

  // Only extend the timeout for API requests
  if (!req.url.includes('/p/create')) {
    next();
    return;
  }

  res.once('finish', () => {
    isFinished = true;
  });

  res.once('end', () => {
    isFinished = true;
  });

  res.once('close', () => {
    isFinished = true;
  });

  res.on('data', (data) => {
    // Look for something other than our blank space to indicate that real
    // data is now being sent back to the client.
    if (data !== space) {
      isDataSent = true;
    }
  });

  const waitAndSend = () => {
    setTimeout(() => {
      // If the response hasn't finished and hasn't sent any data back....
      if (!isFinished && !isDataSent) {
        // Need to write the status code/headers if they haven't been sent yet.
        /*if (!res.headersSent) {
          res.writeHead(202, { 'Content-Type': 'text/html' });
        }*/

        res.write(space);

        // Wait another 15 seconds
        waitAndSend();
      }
    }, 15000);
  };

  waitAndSend();
  next();
};

const handleCloseBrowser = (req, res, browser) => {

  res.setTimeout(150000, function () {
    console.log('Browser Timedout');
    browser.close()
    res.sendStatus(408);
    return res.end();
  });
  req.on('close', () => {
    console.log('Browser Closed')
    browser.close()
    return res.end();
  });
  req.on('end', () => {
    console.log('Browser Ended');
    browser.close()
    return res.end();
  });

  return;

};

app.use(extendTimeoutMiddleware);
/*app.get('/wait', async (req, res) => {
  await delay(125000);
  let ip = await axios.get('https://api.my-ip.io/ip');
  console.log(ip.data)
  res.write('{"extendTimeoutMiddleware": "works"}');
  res.end();
})*/
app.get('/ip', async (req, res) => {
  try {
    let ip = await axios.get('https://api.my-ip.io/ip');
    res.status(200).send(ip.data);
  } catch (error) {
    console.log(error)
    res.status(500).send('server Error');
  }
})
app.get('/p/mail', async (req, res) => {
  /*if (!req.query.email || !req.query.pass) {
    res.set('Content-Type', 'text/html');
    return res.status(404).send('<h3>Not Found<h3><br><strong>Please use /p/mail?email=YOUR_EMAIL&pass=YOUR_PASS</strong>')
  }*/
  res.writeHead(202, { 'Content-Type': 'application/json' });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      //'--headless=chrome',
      '--no-sandbox'
    ],
    //ignoreDefaultArgs: ["--enable-automation"],//  ./myUserDataDir
  });
  console.log('Browser Opened');
  handleCloseBrowser(req, res, browser);

  try {

    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    const blockedResourceTypes = [
      'image',
      'media',
      'font',
      'texttrack',
      'object',
      'beacon',
      'csp_report',
      'imageset',
      'iframe',
      'imgur'
    ];

    const skippedResources = [
      'quantserve',
      'adzerk',
      'doubleclick',
      'adition',
      'exelator',
      'sharethrough',
      'cdn.api.twitter',
      'google-analytics',
      'googletagmanager',
      'fontawesome',
      'facebook',
      'analytics',
      'optimizely',
      'clicktale',
      'mixpanel',
      'zedo',
      'clicksor',
      'tiqcdn',
      'iframe',
      'sharecool',
      'imgur',
      'script'
    ];

    await page.setRequestInterception(true);
    page.on('request', request => {
      const requestUrl = request._url.split('?')[0].split('#')[0];
      if (
        blockedResourceTypes.indexOf(request.resourceType()) !== -1 ||
        skippedResources.some(resource => requestUrl.indexOf(resource) !== -1)
      ) {
        console.log('BLOCADOOOO')
        request.abort();
      } else {
        request.continue();
      }
    });
    /*await page.setRequestInterception(true);
    page.on('request', request => {
      const requestUrl = request._url.split('?')[0].split('#')[0];
      if (
        blockedResourceTypes.indexOf(request.resourceType()) !== -1 ||
        skippedResources.some(resource => requestUrl.indexOf(resource) !== -1)
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });*/
    const userAgent = new UA();
    await page.setUserAgent(userAgent.toString())
    let start = Date.now();
    await page.goto(`https://account.proton.me/login`, { timeout: 25000, waitUntil: 'networkidle2' });
    await page.waitForSelector('#username', { visible: true });
    await page.type('#username', 'albissadavaydavay@proton.me', { delay: 10 });
    await page.type('#password', 'ahamilikeit*', { delay: 10 });
    await page.click('button[type="submit"]', { button: 'left' });
    await page.waitForSelector('div[data-shortcut-target="item-container"]', { visible: true, timeout: 40000 });
    //await page.click('div[data-shortcut-target="item-container"]', { button: 'left' });
    //await page.waitForSelector('.message-iframe > iframe', { visible: true, timeout: 40000 });
    let stop = Date.now();
    console.log(`DONE ${(stop - start) / 1000}s`)
    //let mail_body = await page.evaluate(() => { return document.querySelector('.message-iframe > iframe').contentWindow.document.querySelector('table').innerText })
    //console.log(mail_body);
    res.write(`DONE ${(stop - start) / 1000}s`);
    res.end();

  } catch (error) {
    console.log(error)
    res.write(`{"status": "failed", "reason":"Internal Error"}`);
    res.end();
  } finally {
    console.log('browser closed')
    browser.close()
  }


  await delay(5000);
  res.write(`{"status": "success"}`);
  return res.end();

})
app.get('/p/create', async (req, res) => {


  let headers = {
    "Host": "hcaptcha.com",
    "Connection": "keep-alive",
    "sec-ch-ua": 'Chromium";v="92", " Not A;Brand";v="99", "Google Chrome";v="92',
    "Accept": "application/json",
    "sec-ch-ua-mobile": "?0",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
    "Content-type": "application/json; charset=utf-8",
    "Origin": "https://newassets.hcaptcha.com",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Referer": "https://newassets.hcaptcha.com/",
    "Accept-Language": "en-US,en;q=0.9"
  }

  function N_Data(requ) {
    let x = "0123456789/:abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    requ = requ.split(".")

    requ = {
      "header": JSON.parse(Buffer.from(requ[0] + "=======", 'base64').toString('utf-8')),
      "payload": JSON.parse(Buffer.from(requ[1] + "=======", 'base64').toString('utf-8')),
      "raw": {
        "header": requ[0],
        "payload": requ[1],
        "signature": requ[2]
      }
    }

    function a(r) {
      for (let t = r.length - 1; t >= 0; t--) {
        //console.log(arr[i]);
        if (r[t] < (x.length - 1)) {
          r[t] += 1
          return true
        }
        r[t] = 0
      }
      return false
    }
    function i(r) {
      t = ""
      for (let n = 0; n < r.length; n++) {
        t += x[r[n]]
      }
      return t
    }
    function o(r, e) {
      var a, hashed, n, o, t;
      n = e;
      //crypto.createHash('sha1')
      hashed = crypto.createHash('sha1').update(Buffer.from(e, 'utf-8'));
      hashed2 = crypto.createHash('sha1').update(Buffer.from(e, 'utf-8'));
      //console.log(Buffer.from(e, 'utf-8'))
      o = hashed.digest('hex');
      t = hashed2.digest();
      //console.log(t)
      /*
      hashed = hashlib.sha1(e.encode());
      o = hashed.hexdigest();
      t = hashed.digest();*/
      e = null;
      n = -1;
      o = [];

      for (n = n + 1; n < (8 * t.length); n++) {
        e = t[Math.floor(n / 8)] >> n % 8 & 1;
        o.push(e);
      }

      a = o.slice(0, r);
      function index2(x, y) {
        if (x.includes(y)) {
          return x.indexOf(y)
        }
        return -1;
      }
      //console.log((0 === a[0]) && (index2(a, 1) >= (r - 1)) || (-1 === index2(a, 1)))
      return (0 == a[0]) && (index2(a, 1) >= (r - 1)) || (-1 == index2(a, 1));
    }

    function get() {
      for (let e = 0; e < 25; e++) {
        n = Array.from({ length: e }, (_, i) => 0)
        while (a(n)) {
          u = requ["payload"]["d"] + "::" + i(n)
          if (o(requ["payload"]["s"], u)) {
            return i(n)
          }
        }
      }
    }

    let result = get();
    hsl = [
      "1",
      requ["payload"]["s"].toString(),
      new Date().toISOString().slice(0, 19).replaceAll("T", "").replaceAll("-", "").replaceAll(":", ""),
      requ["payload"]["d"],
      "",
      result
    ].join(':')

    return hsl;
  }
  async function REQ_Data(host, sitekey) {
    try {
      let r = await axios.get(`https://hcaptcha.com/checksiteconfig?host=${host}&sitekey=${sitekey}&sc=1&swa=1`, { headers: headers })
      r = r.data
      if (r["pass"])
        return r["c"];
      else
        return false;
    } catch (error) {
      return false;
    }
  }
  async function Get_Captcha(host, sitekey, n, requ/*, proxy*/) {

    try {


      json = {
        "sitekey": sitekey,
        "v": "b1129b9",
        "host": host,
        "n": n,
        'motiondata': '{"st":1628923867722,"mm":[[203,16,1628923874730],[155,42,1628923874753],[137,53,1628923874770],[122,62,1628923874793],[120,62,1628923875020],[107,62,1628923875042],[100,61,1628923875058],[93,60,1628923875074],[89,59,1628923875090],[88,59,1628923875106],[87,59,1628923875131],[87,59,1628923875155],[84,56,1628923875171],[76,51,1628923875187],[70,47,1628923875203],[65,44,1628923875219],[63,42,1628923875235],[62,41,1628923875251],[61,41,1628923875307],[58,39,1628923875324],[54,38,1628923875340],[49,36,1628923875363],[44,36,1628923875380],[41,35,1628923875396],[40,35,1628923875412],[38,35,1628923875428],[38,35,1628923875444],[37,35,1628923875460],[37,35,1628923875476],[37,35,1628923875492]],"mm-mp":13.05084745762712,"md":[[37,35,1628923875529]],"md-mp":0,"mu":[[37,35,1628923875586]],"mu-mp":0,"v":1,"topLevel":{"st":1628923867123,"sc":{"availWidth":1680,"availHeight":932,"width":1680,"height":1050,"colorDepth":30,"pixelDepth":30,"availLeft":0,"availTop":23},"nv":{"vendorSub":"","productSub":"20030107","vendor":"Google Inc.","maxTouchPoints":0,"userActivation":{},"doNotTrack":null,"geolocation":{},"connection":{},"webkitTemporaryStorage":{},"webkitPersistentStorage":{},"hardwareConcurrency":12,"cookieEnabled":true,"appCodeName":"Mozilla","appName":"Netscape","appVersion":"5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36","platform":"MacIntel","product":"Gecko","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36","language":"en-US","languages":["en-US","en"],"onLine":true,"webdriver":false,"serial":{},"scheduling":{},"xr":{},"mediaCapabilities":{},"permissions":{},"locks":{},"usb":{},"mediaSession":{},"clipboard":{},"credentials":{},"keyboard":{},"mediaDevices":{},"storage":{},"serviceWorker":{},"wakeLock":{},"deviceMemory":8,"hid":{},"presentation":{},"userAgentData":{},"bluetooth":{},"managed":{},"plugins":["internal-pdf-viewer","mhjfbmdgcfjbbpaeojofohoefgiehjai","internal-nacl-plugin"]},"dr":"https://discord.com/","inv":false,"exec":false,"wn":[[1463,731,2,1628923867124],[733,731,2,1628923871704]],"wn-mp":4580,"xy":[[0,0,1,1628923867125]],"xy-mp":0,"mm":[[1108,233,1628923867644],[1110,230,1628923867660],[1125,212,1628923867678],[1140,195,1628923867694],[1158,173,1628923867711],[1179,152,1628923867727],[1199,133,1628923867744],[1221,114,1628923867768],[1257,90,1628923867795],[1272,82,1628923867811],[1287,76,1628923867827],[1299,71,1628923867844],[1309,68,1628923867861],[1315,66,1628923867877],[1326,64,1628923867894],[1331,62,1628923867911],[1336,60,1628923867927],[1339,58,1628923867944],[1343,56,1628923867961],[1345,54,1628923867978],[1347,53,1628923867994],[1348,52,1628923868011],[1350,51,1628923868028],[1354,49,1628923868045],[1366,44,1628923868077],[1374,41,1628923868094],[1388,36,1628923868110],[1399,31,1628923868127],[1413,25,1628923868144],[1424,18,1628923868161],[1436,10,1628923868178],[1445,3,1628923868195],[995,502,1628923871369],[722,324,1628923874673],[625,356,1628923874689],[523,397,1628923874705],[457,425,1628923874721]],"mm-mp":164.7674418604651},"session":[],"widgetList":["0a1l5c3yudk4"],"widgetId":"0a1l5c3yudk4","href":"https://discord.com/register","prev":{"escaped":false,"passed":false,"expiredChallenge":false,"expiredResponse":false}}',
        "hl": "en",
        "c": JSON.stringify(requ)
      }
      data = querystring.stringify(json);
      headers_ = {
        "Host": "hcaptcha.com",
        "Connection": "keep-alive",
        "sec-ch-ua": 'Chromium";v="92", " Not A;Brand";v="99", "Google Chrome";v="92',
        "Accept": "application/json",
        "sec-ch-ua-mobile": "?0",
        "Content-length": data.length.toString(),
        "Cookie": "hc_accessibility=JBQKMedWEE3JvrmaPUlzyTr4sBlNp6p0Edyvm3TwrBwJtn2nDzNAXzynVRnMbZUJLtEB+3CyS+EzS+IKHA9qLC4rSHpjLdeFAirR0u9T78VKb5Pq+I+ailJ8PlDEjZ2MN1jcu+PPKAPomxcpgMKs7zc7dtDnJmaTlNF5ui9D5NlSgn7ylJ0YShkTlEyuhNjLilqjpqjSFg4wOGE/RX+7AvKjMKx6DaGFa7DTGHvFvEbBEGlNBA6lzDLccTWDx87QBeo+TsewK6505IN/BuY8jGsJIxlcgZX3o+b9q1KSwq6UN2W43SO4YqrGttPbe/F3wUXADtvalgwtYpolJ4vgqzjlHLGj7guzQD8q4JSInwKMUHWgHJ+ljR8ow2oaprW413vzGBe4EW+E+TeBZpP2FLIGHrE53Wz0wcaHpydLTMr8IcchptFOMSh+lx2himix3Y6AjFzFJw8/ejl8ORL5BJoVi2cvxbp8ZGRhMaHVj3t6wLUZC0Dp+4peZ3Ms2Jg0uPtxeXffftUtEVSz53ilJ/QQiNyWT1bciSx2LMy0u03dXJdlhBkgMLt6d3Nvqn1dDdtc5aqgW6mRIROgIDeoPwP1V4PdEi9gkhBNThECSui5FsnW0MlYzskrcc54aYtXiK85JzFgz+X85yHQxr3NCqLHgBm+E0iVA3a1CMsD6IHEQaJ4qQFGpc5rW3sVWxXSiHKVOhiBXgpwfY/k/1ETW7Az4vbEjX8OgZHh28JvW9eSL8da5rGlz/9C72DLRg3Q4HAXAmAU/YjI7kJELc19HnD1LiL9RQt4sQE7M++5FHQTeqiK68nI7PyYtwH2nzH4ZIMVGCuKiaQ43hIc5KCmcnV/7BKRXg7pZx6/p1qdySTMi/jRS2Ru1fwWErI7pI3i92UQeLYMuM3b4nst6kciaMCkVxPEO71zpSss6/HoRuPZBPCZJkxFM+r28lLTOgFzZyjZ1MjaOTnKwi4ndmS2AVQ6GutOy8l+fKfn7IZzsg7xe61yjcK2AhPJgRM7Rzj7jt52zdoaB4vDcltGthl8pT5zADmw8kGMaqVN2M4K3vt6ef+vqoKa6bBQVbqoNO/akiN7HSeXyxx3xO/JONtoUg==VclPAlTu9lNItq07;",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
        "Content-type": "application/x-www-form-urlencoded",
        "Origin": "https://newassets.hcaptcha.com",
        "Sec-Fetch-Site": "same-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        "Referer": "https://newassets.hcaptcha.com/",
        "Accept-Language": "en-US,en;q=0.9"
      }


      r = await axios.post(`https://hcaptcha.com/getcaptcha?s=${sitekey}`, data, { headers: headers_ })

      return r.data
      /*
      function myPromise(timeout) {
        return new Promise(async (resolve, reject) => {
          // Set up the timeout
          const timer = setTimeout(() => {
            console.log('timedout')
            resolve(null);
          }, timeout);
          try {
            r = await axios.post(`https://hcaptcha.com/getcaptcha?s=${sitekey}`, data, {
              headers: headers_,
              proxy: false,
              httpsAgent: new httpsProxyAgent.HttpsProxyAgent('http://' + proxy)
            })
            resolve(r.data)
            //clearTimeout(timer);
          } catch (error) {
            resolve(null)
          } finally {
            clearTimeout(timer)
          }

        });
      }
      let ret = await myPromise(4000);
      return ret;*/

    } catch (error) {
      console.log(error)
    }

  }

  res.writeHead(202, { 'Content-Type': 'application/json' });
  if (!req.query.email || !req.query.pass) {
    res.set('Content-Type', 'text/html');
    return res.status(404).send('<h3>Not Found<h3><br><strong>Please use /p/create?email=YOUR_EMAIL&pass=YOUR_PASS</strong>')
  }

  const extension = path.join(__dirname, 'callbackHooker')
  /*const chrome = path.join(__dirname, 'GoogleChromePortable', 'App', 'Chrome-bin', 'chrome.exe').replaceAll('\\', '/')
  console.log('extension path')
  console.log(extension)
  console.log('chrome path', typeof chrome)
  console.log(chrome)*/
  const browser = await puppeteerS.launch({
    headless: true,
    //executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: [
      `--headless=chrome`,
      //'--disk-cache-size=0',
      //'--disable-web-security',
      //'--disable-features=IsolateOrigins,site-per-process',
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      '--no-sandbox'
    ],
    ignoreDefaultArgs: ["--enable-automation"],//  ./myUserDataDir
    userDataDir: './myUserDataDir'//MUDARRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR <-------------------------------------------------------------------------mudar no deploy
  })
  console.log('Init');
  res.setTimeout(150000, function () {
    console.log('Request has timed out.');
    browser.close()
    res.sendStatus(408);
  });
  req.on('close', () => {
    console.log('browser closed')
    browser.close()
    return res.end();
  });
  req.on('end', () => {
    console.log('browser closed');
    browser.close()
    return res.end();
  });

  try {

    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    const userAgent = new UA();
    await page.setUserAgent(userAgent.toString())

    //APPENDICE
    await page.setRequestInterception(true);
    var index = 0;
    page.on('request', async request => {
      console.log('ALL', index)
      if (request.url().includes('api/vpn/location')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: `{"Code":1000,"IP":"185.153.176.182","Lat":-23.5335,"Long":-46.635899999999999,"Country":"BR","ISP":"Tefincom S.A."}`
        })
      } else if (request.url().includes('api/v4/users')) {
        if (index != 0) {
          console.log('Proxied')
          useProxy(request, 'http://52.45.107.168:80');
        } else {
          request.continue();
          index++;
        }
        console.log('a', index)
      }
      else if (request.url().includes('unsupported.')) {
        console.log('aborted');
        request.abort();
      }
      else {
        request.continue();
      }

    });









    /*await page.setCacheEnabled(false);
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');*/

    //#PART 1
    await page.goto(`https://account.proton.me/signup?plan=free&billing=12&currency=EUR&language=en`, { timeout: 45000, waitUntil: 'networkidle2' });

    /*await page.goto(`https://dashboard.hcaptcha.com/signup?type=accessibility`, { timeout: 45000, waitUntil: 'networkidle0' });
    await page.waitForSelector('#email', { visible: true });
    await page.type('#email', req.query.email, { delay: 233 });
    await page.mouse.move(randomIntFromInterval(10, 9999), randomIntFromInterval(10, 9999));
    await page.mouse.move(randomIntFromInterval(10, 9999), randomIntFromInterval(10, 9999));
    await delay(5000);
    await page.click('button', {
      button: 'left',
    });
    await delay(10000);
    const base64 = await page.screenshot({ encoding: "base64" });
    //res.status(200).send(base64);
    res.write(`<img src="data:image/png;base64,${base64}"></img>`);
    return res.end();
    await delay(20565600);*/
    // try {
    //   await page.waitForSelector('#onetrust-accept-btn-handler', { visible: true, timeout: 20000 });
    //   await page.click('#onetrust-accept-btn-handler', { button: 'left' });
    // } catch (error) { }

    // await autoScroll(page);


    // try {

    //   await page.waitForSelector('iframe[src*="https://www.google.com/recaptcha/api2/anchor"]', { visible: true, timeout: 30000 });
    //   const frames = await page.frames();
    //   const frame = frames.find(frame => frame.url().includes('/recaptcha/api2/anchor?'));
    //   const content_frame = frames.find(frame => frame.url().includes('/recaptcha/api2/bframe?'));

    //   await frame.waitForSelector('#recaptcha-anchor', { visible: true, timeout: 15000 });
    //   //await delay(2000);
    //   //const button = await frame.$('#recaptcha-anchor');
    //   await page.mouse.move(randomIntFromInterval(10, 9999), randomIntFromInterval(10, 9999));
    //   await delay(2000);
    //   await frame.click('#recaptcha-anchor', {
    //     button: 'left',
    //   });


    //   //SCREENSHOTA
    //   await delay(5000);
    //   const base64_1 = await page.screenshot({ encoding: "base64" });
    //   res.write(`<img src="data:image/png;base64,${base64_1}"></img><br>`);


    //   /* await content_frame.waitForSelector('#recaptcha-audio-button', { visible: true, timeout: 30000 });
    //    await content_frame.click('#recaptcha-audio-button', {
    //      button: 'left',
    //    });*/
    //   await content_frame.waitForSelector('.help-button-holder', { visible: true, timeout: 25000 });
    //   await page.mouse.move(randomIntFromInterval(10, 9999), randomIntFromInterval(10, 9999));
    //   await delay(15);
    //   await content_frame.click('.help-button-holder', {
    //     button: 'left',
    //   });
    //   console.log('solve button clicked');
    //   await frame.waitForSelector('#recaptcha-anchor[aria-checked*="true"]', { timeout: 25000, visible: true })

    // } catch (error) {
    //   console.log(error)
    // }

    // await delay(8000);
    // const base64 = await page.screenshot({ encoding: "base64" });
    // res.write(`<img src="data:image/png;base64,${base64}"></img><br>`);
    // return res.end();

    /*
    const base64 = await page.screenshot({ encoding: "base64" });
    //res.status(200).send(base64);
    res.write(`<img src="data:image/png;base64,${base64}"></img>`);
    return res.end();*/


    //fs.writeFileSync('puta.txt', `<img src="data:image/png;base64,${base64}"></img>`, { encoding: 'utf8' })

    //res.set('Content-Type', 'text/html');
    //return res.status(200).send(Buffer.from(`<img src="data:image/png;base64,${base64}"></img>`));


    let email = req.query.email;
    let pass = req.query.pass;
    await page.type('#email', email, { delay: 10 });
    await page.type('#password', pass, { delay: 10 });
    await page.type('#repeat-password', pass, { delay: 10 });
    await page.evaluate(() => { document.querySelector('#select-domain').click() });
    let domains = ['proton.me', 'protonmail.com'];
    let chosen_domain = domains[Math.floor(Math.random() * domains.length)];
    console.log(chosen_domain);
    await page.waitForSelector(`button[title='${chosen_domain}']`, { visible: true });
    console.log('waitForSelector button DONE');
    await page.click(`button[title='${chosen_domain}']`, { button: 'left' });
    console.log('click button DONE');
    await page.click(`button[type='submit']`, { button: 'left' });
    console.log('CLICKED SUBMIT');


    //temp_mail # PART 1
    /*task = randomIntFromInterval(0, 6);
    sid = randomIntFromInterval(100000, 999999);
    new_tempmail = await axios.post(`https://api.mytemp.email/1/inbox/create?sid=${sid}&task=${task}&tt=138`);
    hash = new_tempmail.data.hash;
    mail = new_tempmail.data.inbox;
    console.log(new_tempmail.data.inbox);*/

    //#PART 2
    //await page.waitForSelector('iframe[title="Captcha"]', { visible: true, timeout: 25000 });
    //await autoScroll(page);

    await page.waitForFrame(async (frame) => {
      return frame.url().includes('.hcaptcha.com');
    }, { timeout: 15000 });


    const frame = await page.frames().find(f => f.url().includes('captcha?Token'));
    await frame.waitForSelector('#anycaptchaSolveButton', { visible: true });
    requ = await REQ_Data("account-api.proton.me", "f99ae21a-1f92-46a4-938e-da6a6afb72ec")
    requ["type"] = "hsl"
    n = N_Data(requ["req"])
    resu = await Get_Captcha("account-api.proton.me", "f99ae21a-1f92-46a4-938e-da6a6afb72ec", n, requ)
    /*do {
      resu = await Get_Captcha("account-api.proton.me", "f99ae21a-1f92-46a4-938e-da6a6afb72ec", n, req, proxies[Math.floor(Math.random() * proxies.length)])
    } while (!resu);*/
    let captcha;
    if (resu["generated_pass_UUID"]) {
      captcha = resu["generated_pass_UUID"]
    } else {
      throw Error('FAILED TO GET TOKEN')
    }
    await frame.evaluate((captcha) => document.getElementById('anycaptchaSolveButton').onclick(captcha), captcha)

    await delay(10000);
    await page.goto(`https://account.proton.me/login`, { timeout: 35000, waitUntil: 'load' });
    await page.waitForSelector('button[type="submit"]', { visible: true });

    await page.type('#username', `${email}@${chosen_domain}`, { delay: 10 });
    await page.type('#password', pass, { delay: 10 });
    await page.click('button[type="submit"]', { button: 'left' })

    await delay(10000);
    const base64_1 = await page.screenshot({ encoding: "base64" });
    res.write(`<img src="data:image/png;base64,${base64_1}"></img><br>`);

    //await page.waitForSelector(`input[value*="${email}"]`, { visible: true, timeout: 40000 });
    await page.waitForSelector('.flex-item-fluid.p0-5.on-tiny-mobile-text-left', { timeout: 10000 });
    //await page.click(`.button-large`, { button: 'left' });
    //await page.waitForSelector(`input[value*="${mail}"]`);
    //await page.click(`.button-large`, { button: 'left' });
    await delay(5000);
    res.write(`{"status": "success","email":"${email}@${chosen_domain}", "pass":"${pass}"}`);
    return res.end();
    return
    await page.click('#label_1', { button: 'left' });
    await page.type('#email', mail, { delay: 10 });
    await page.click(`.button-large`, { button: 'left' });

    await delay(10000);
    //temp_mail # PART 2
    new_tempmail = await axios.get(`https://api.mytemp.email/1/inbox/check?inbox=${mail}&hash=${hash}&sid=${sid}&task=${task}&tt=138`);
    if (new_tempmail.data.emls[0].from_name === 'Proton') {
      eml = new_tempmail.data.emls[0].eml;
      hash2 = new_tempmail.data.emls[0].hash;
      tempmail_text = await axios.get(`https://api.mytemp.email/1/eml/get?eml=${eml}&hash=${hash2}&sid=${sid}&task=${task}&tt=429`);
      body = tempmail_text.data.body_text;
      confimation_number = body.match(/[^\n]+$/g)[0];
      console.log(confimation_number);
    }

    await page.type('#verification', confimation_number, { delay: 10 });
    await page.click(`.button-large`, { button: 'left' });
    await page.waitForSelector(`input[value*="${email}"]`);
    await page.click(`.button-large`, { button: 'left' });
    await page.waitForSelector(`input[value*="${mail}"]`);
    await page.click(`.button-large`, { button: 'left' });

    await delay(5000);
    res.write(`{"status": "success","email":"${email}@${chosen_domain}", "pass":"${pass}"}`);
    res.end();
    //res.set('Content-Type', 'application/json');
    //res.status(200).send(`{status: 'success', email:"${email}@${chosen_domain}", pass:"${pass}"}`);
    //await page.goto(`https://api.myip.com/`, { timeout: 35000, waitUntil: 'load' });


    /*await delay(15000);
    const base64 = await page.screenshot({ encoding: "base64" });
    //res.status(200).send(base64);
    res.set('Content-Type', 'text/html');
    res.status(200).send(Buffer.from(`<img src="data:image/png;base64,${base64}"></img>`));*/

  } catch (error) {
    console.log(error)
    res.write(`{"status": "failed", "reason":"Internal Error"}`);
    res.end();
  } finally {
    console.log('browser closed')
    browser.close()
  }


  /*
  if (!req.params.link) return res.status(404).send('Provide info please!');

  if (req.params.link.includes('&&&')) {



  } else {
    res.status(404).send('Not Found')
  }*/
})










app.get('/p/access', async (req, res) => {

  res.writeHead(202, { 'Content-Type': 'text/html' });

  const browser = await puppeteerS.launch({
    headless: true,
    //executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: [
      `--headless=chrome`,
      //'--disk-cache-size=0',
      //'--disable-web-security',
      //'--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox'
    ],
    ignoreDefaultArgs: ["--enable-automation"],//  ./myUserDataDir
    //userDataDir: './myUserDataDir'//MUDARRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR <-------------------------------------------------------------------------mudar no deploy
  })
  console.log('Init');
  res.setTimeout(150000, function () {
    console.log('Request has timed out.');
    browser.close()
    res.sendStatus(408);
  });
  req.on('close', () => {
    console.log('browser closed')
    browser.close()
    return res.end();
  });
  req.on('end', () => {
    console.log('browser closed');
    browser.close()
    return res.end();
  });

  try {

    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    const userAgent = new UA();
    await page.setUserAgent(userAgent.toString())
    await page.goto(`https://accounts.hcaptcha.com/verify_email/050936a1-532c-460f-99eb-19999cbf050f`, { timeout: 25000, waitUntil: 'networkidle2' });
    await page.waitForSelector('button[data-cy="setAccessibilityCookie"]');
    await page.click('button[data-cy="setAccessibilityCookie"]', {
      button: 'left',
    });
    await delay(10000);
    const cookies = await page.cookies()
    console.log(cookies)
    const base64 = await page.screenshot({ encoding: "base64" });
    res.write(`<img src="data:image/png;base64,${base64}"></img><br>`);

  } catch (error) {
    console.log(error)
    res.write(`{"status": "failed", "reason":"Internal Error"}`);
    res.end();
  } finally {
    console.log('browser closed')
    browser.close()
  }

})


app.get('/p/first', async (req, res) => {

  res.writeHead(202, { 'Content-Type': 'application/json' });
  if (!req.query.email || !req.query.pass) {
    res.set('Content-Type', 'text/html');
    return res.status(404).send('<h3>Not Found<h3><br><strong>Please use /p/first?email=YOUR_EMAIL&pass=YOUR_PASS</strong>')
  }
  res.setTimeout(150000, function () {
    console.log('Request has timed out.');
    res.sendStatus(408);
  });
  req.on('close', () => {
    return res.end();
  });
  req.on('end', () => {
    return res.end();
  });
  try {

    let start = Date.now();
    const client = new protonmail.ProtonmailClient();

    // login to the protonmail
    await client.login({
      username: req.query.email,
      loginPassword: req.query.pass,
    });

    // fetch private keys in order to decrypt messages
    await client.fetchKeys({
      password: req.query.pass,
    });

    // fetch the first 2 messages
    const messagesResponse = await client.messages.list({
      LabelID: protonmail.DefaultLabels.All,
      Limit: 2,
      Page: 0,
    });

    // take the first one
    const firstMessage = messagesResponse.Messages[0];
    // get the full message with body
    const m = await client.messages.get(firstMessage.ID);

    // decrypt message
    const m_decrypted = await client.decryptMessage(m.Message);

    let stop = Date.now();
    const $ = cheerio.load(m_decrypted, {
      xml: {
        normalizeWhitespace: true,
      },
    });
    let txt = $('body').text();
    message = txt.replaceAll(/(\r\n|\r|\n)/g, '\n').replaceAll(/\s\s+|\xA0|&nbsp;/g, ' ');

    await client.logout();

    res.write(`{"status": "success", "duration":"${(stop - start) / 1000}s", "message":"${message}"}`);
    res.end();



  } catch (error) {
    console.log(error)
    res.write(`{"status": "failed", "reason":"Internal Error"}`);
    res.end();
  }

})

for (let middleware in middlewares) {
  app.use(middlewares[middleware]);
}

// TODO: allow server config
app.listen(port, host, function () {
  console.log('MEGA streaming on ' + host + ':' + port);
});
