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
        if (!res.headersSent) {
          res.writeHead(202, { 'Content-Type': 'text/html' });
        }

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




  if (!req.query.email || !req.query.pass) {
    res.set('Content-Type', 'text/html');
    return res.status(404).send('<h3>Not Found<h3><br><strong>Please use /p/create?email=YOUR_EMAIL&pass=YOUR_PASS</strong>')
  }

  const extension = path.join(__dirname, '1.3.1_1')
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
    browser.close()
    return res.end();
  });
  req.on('end', () => {
    browser.close()
    return res.end();
  });

  try {

    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    const userAgent = new UA();
    await page.setUserAgent(userAgent.toString())
    await page.setCacheEnabled(false);
    const client = await page.target().createCDPSession()
    await client.send('Network.clearBrowserCookies')

    //#PART 1
    await page.goto(`https://signup.heroku.com/`, { timeout: 45000, waitUntil: 'networkidle2' });
    //await page.goto(`https://antoinevastel.com/bots/`, { timeout: 45000, waitUntil: 'networkidle2' });
    //await delay(4000000);
    await page.waitForSelector('#onetrust-accept-btn-handler', { visible: true });
    await page.click('#onetrust-accept-btn-handler', { button: 'left' });
    await autoScroll(page);

    async function rcaptcha(page) {
      await new Promise(async (resolve, reject) => {

        await page.waitForSelector('iframe[src*="https://www.google.com/recaptcha/api2/anchor"]', { visible: true, timeout: 30000 });
        const frames = await page.frames();
        const frame = frames.find(frame => frame.url().includes('/recaptcha/api2/anchor?'));
        //console.log(frames)
        const content_frame = frames.find(frame => frame.url().includes('/recaptcha/api2/bframe?'));
        try {

          await frame.waitForSelector('#recaptcha-anchor', { timeout: 10000 });
          //const button = await frame.$('#recaptcha-anchor');
          await page.mouse.move(randomIntFromInterval(10, 9999), randomIntFromInterval(10, 9999));
          await frame.click('#recaptcha-anchor', {
            button: 'left',
          });
          await page.mouse.move(randomIntFromInterval(10, 9999), randomIntFromInterval(10, 9999));
          await content_frame.waitForSelector('#recaptcha-audio-button', { visible: true, timeout: 30000 });
          await content_frame.click('#recaptcha-audio-button', {
            button: 'left',
          });
          //await frame.waitForSelector('#recaptcha-anchor[aria-checked*="true"]', { timeout: 10000, visible: true });
          resolve('BYPASSED');
        } catch (error) {
          console.log(error)
          resolve('FAIL')
          try {
            await content_frame.click('#recaptcha-reload-button', {
              button: 'left',
            });
          } catch (error) { }
          await page.mouse.click(10, 400);
          return rcaptcha(page);
        }
      });
    }

    await delay(6000);
    await rcaptcha(page);
    await delay(6000);
    const base64 = await page.screenshot({ encoding: "base64" });
    res.write(`<img src="data:image/png;base64,${base64}"></img>`);
    return res.end();

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
