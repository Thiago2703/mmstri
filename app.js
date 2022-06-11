/**
 * npm module deps
 */
const express = require('express');
const delay = require('delay');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
var UA = require('user-agents');

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
app.get('/p/create', async (req, res) => {



  res.writeHead(202, { 'Content-Type': 'text/html' });
  if (!req.query.email || !req.query.pass) {
    res.set('Content-Type', 'text/html');
    return res.status(404).send('<h3>Not Found<h3><br><strong>Please use /p/create?email=YOUR_EMAIL&pass=YOUR_PASS</strong>')
  }

  const extension = path.join(__dirname, '1.3.1_0')
  /*const chrome = path.join(__dirname, 'GoogleChromePortable', 'App', 'Chrome-bin', 'chrome.exe').replaceAll('\\', '/')
  console.log('extension path')
  console.log(extension)
  console.log('chrome path', typeof chrome)
  console.log(chrome)*/
  const browser = await puppeteerS.launch({
    headless: false,
    //executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: [
      //`--headless=chrome`,
      //'--disk-cache-size=0',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
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
    await page.setCacheEnabled(false);
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');

    //#PART 1
    //await page.goto(`https://account.proton.me/signup?plan=free&billing=12&currency=EUR&language=en`, { timeout: 45000, waitUntil: 'networkidle2' });
    const cookies = [{
      'domain': '.hcaptcha.com',
      'name': 'hc_accessibility',
      'value': 'dnTzpBkl6SBDZLFk27zWKaIdGuB10HsBCGHkbDJo1YllcsEWtKIFO68KnsUb+ZPF1JHH1nk4MqAh6XDQgoGsJ7hld73LLAlbb35S64TtwyC/mF0KlickWhVgwpeX/wHDNs4iUHIhXX5yTkKm98/PNZwhZjJoyu5SyqzhcN/JY4pcCHiYcohyZLQhhjQPKplv+dyjeMCx16hBJKwte8KJV8U1J1NUq7kmvslp+dZx3yY5TVirmlDzyVS9pQVeMTQAeyZereLV78RGNM0mXTHJuqIyf4KrdtrOnIsCtQeGpF7LatsKj2Q90IWHW2X8v8hrzQmddUbZoHNuayRC3LSkjoj3Q/DOfrN8a955zZ6h7nwzdRicMRT0uL58iLPF5A0Lf86/mEBzE0iAb4ReOjoJpKltR4ULK72TDFZ41UF6zWTDqxh6XAVdFZkEyXh6ahk2L1Y/XbQdHrilT0RdkVvepvxb/CbXBuM+/DX2oHbPkj1h14ICe+9H1q3YFYOuG0pfJ3iBp8NV+aBZisfO9XVQqR8DuAiCC+Ou0boEwDsj4TS3yxmqL9g6+o7qs/M7KD9e1CapzhpQ9k5B6+Tb9wHxxMWZjy/aLjQXS7TN/G8Mtzg2jPyCageZJow6NQ8fpq/BbsSV/qzqMYkCLX2rrIJDlsVRoBt0P1pSK6CXG34cdVc4LlEC/8W9uEJLNXZhniyobeE3MB7b6ycUwUNu/2c9eIZ4YYQ+LVizVl26OPHVlP03IimCKm+Wk2aX/0kNIn9n7uZp6ZiuNxysJCoo/Y/qP1Rb+/+g710AQyRxcPii3EdUrshIWt1THmoN6/v+XtGucUuUybrubK5/vQRvgSVW2XOlD2TkbYl5rvWCELoKHpcrrDl87yUtaDRB8wxFmAwqRg+cFe6/algZI2fupW32KD6GJTNgxqQyWYwXsH3fjK93V142aQ6l3R1M/oDonSxSSNzSeB77T5C+ynMZ3sba6ht3IqXnK7rnsC9r9ArN2r7jy3/bJmdjDEOKgqvfM5/F47RWqfuUMO9FFkMCSA1YeDH62MmIp917CKnmMO04gSPl8/ISxJlHnzzOdExuB1YaNK1Eczr+TJ11zT2g'
    }, {
      'domain': '.hcaptcha.com',
      'name': 'session',
      'value': 'f8d958df-dda3-4a7a-b548-75da990ee150'
    },];
    await page.setCookie(...cookies);
    await page.goto(`https://account.proton.me/signup?plan=free&billing=12&currency=EUR&language=en`, { timeout: 45000, waitUntil: 'networkidle2' });


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
    await page.waitForSelector('#label_1', { visible: true });

    await autoScroll(page);

    await delay(10000);
    const base64_1 = await page.screenshot({ encoding: "base64" });
    res.write(`<img src="data:image/png;base64,${base64_1}"></img><br>`);


    await page.waitForSelector(`input[value*="${email}"]`, { visible: true, timeout: 40000 });
    await page.click(`.button-large`, { button: 'left' });
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


for (let middleware in middlewares) {
  app.use(middlewares[middleware]);
}

// TODO: allow server config
app.listen(port, host, function () {
  console.log('MEGA streaming on ' + host + ':' + port);
});
