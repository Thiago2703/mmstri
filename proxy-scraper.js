
const axios = require('axios');
const wrapper = require('axios-cookiejar-support');
const tough = require('tough-cookie');
const cookieJar = new tough.CookieJar();
const client = wrapper.wrapper(axios);
const _ = require('lodash');
const cheerio = require('cheerio');
const proxy_check = require('./proxy-checker.js');

async function scrape_proxies(url, opts = { useCheerio: false, customRegex: false, isNN: false, isDocker: false, isDaily: false }) {
    const { useCheerio, customRegex, isNN, isDocker, isDaily } = opts;

    let res = await client.get(url, { jar: cookieJar, withCredentials: true });
    let data = res.data;

    if (useCheerio) {
        console.log('cheerio')
        const $ = cheerio.load(data, {
            xml: {
                normalizeWhitespace: true,
            },
        });

        if (isDocker) {
            let token_ = $('head').find('meta[name="_token"]').attr('content');
            let params = new URLSearchParams(url.replace(/[^]*search\?/g, ''));
            let _items = { country: 'all', city: 'all', state: 'all', port: 'all', type: 'http-https', anonymity: 'all', need: 'all' };
            for (const param of params) {
                if (param)
                    if (param[1] !== '') _items[param[0]] = param[1]
            }
            let array = [];
            for (let pg = 1; pg <= 3; pg++) {
                let data1 = await client.post('https://www.proxydocker.com/en/api/proxylist/',
                    `token=${token_}&country=${_items.country}&city=${_items.city}&state=${_items.state}&port=${_items.port}&type=${_items.type}&anonymity=${_items.anonymity}&need=${_items.need}&page=${pg}`
                    , { jar: cookieJar })
                data1.data.proxies.forEach(proxy => {
                    array.push(proxy.ip + ':' + proxy.port);
                });
            }
            return array;
        }
        else if (isNN) {
            eval($('head > script').text());
            let array = [];
            $('#proxylist > tr').toArray().map(item => {
                item = $(item).find('td:eq(1)').text()
                new Function('arg1', 'arg1.push("' + item.replace('document.write', '"+') + ')')(array)
            });
            return array;
        } else if (isDaily) {
            data = $('.centeredProxyList.freeProxyStyle').first().text()
        } else {
            data = $('body').text()
        }
    }
    let matches;
    if (customRegex) {
        matches = data.match(customRegex);
    } else {
        matches = data.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\:\d{1,5}/g);
    }
    return matches;
}


async function start(ALL_ALIVE) {
    console.log('[SCRAPER] Started')
    _proxies = _.union(
        await scrape_proxies('https://sslproxies.org/#'),
        await scrape_proxies('https://us-proxy.org/#'),
        await scrape_proxies('https://free-proxy-list.net/#'),
        await scrape_proxies('https://free-proxy-list.net/uk-proxy.html'),
        await scrape_proxies('https://free-proxy-list.net/anonymous-proxy.html'),
        await scrape_proxies('https://spys.me/proxy.txt'),
        await scrape_proxies('https://www.proxy-list.download/api/v1/get?type=http'),
        await scrape_proxies('https://api.proxyscrape.com/?request=getproxies&proxytype=http'),
        await scrape_proxies('https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all'),
        await scrape_proxies('https://proxy50-50.blogspot.com/'),
        await scrape_proxies('https://www.ip-adress.com/proxy-list', { useCheerio: true }),
        await scrape_proxies('https://www.my-proxy.com/free-anonymous-proxy.html'),
        await scrape_proxies('https://www.my-proxy.com/free-elite-proxy.html'),
        await scrape_proxies('https://www.my-proxy.com/free-transparent-proxy.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list-2.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list-3.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list-4.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list-5.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list-6.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list-7.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list-8.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list-9.html'),
        await scrape_proxies('https://www.my-proxy.com/free-proxy-list-10.html'),
        await scrape_proxies('http://nntime.com/proxy-updated-01.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-02.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-03.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-04.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-05.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-06.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-07.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-08.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-09.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-10.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('http://nntime.com/proxy-updated-11.htm', { useCheerio: true, isNN: true }),
        await scrape_proxies('https://www.proxydocker.com/en/proxylist/', { useCheerio: true, isDocker: true }),
        await scrape_proxies('https://www.proxydocker.com/en/proxylist/search?need=all&type=http-https&anonymity=TRANSPARENT&port=&country=&city=&state=all', { useCheerio: true, isDocker: true }),
        await scrape_proxies('https://www.proxydocker.com/en/proxylist/search?need=all&type=http-https&anonymity=ELITE&port=&country=&city=&state=all', { useCheerio: true, isDocker: true }),
        await scrape_proxies('https://www.proxydocker.com/en/proxylist/search?need=all&type=http-https&anonymity=ANONYMOUS&port=&country=&city=&state=all', { useCheerio: true, isDocker: true }),
        await scrape_proxies('https://premiumproxy.net/http-proxy-list', { useCheerio: true }),
        await scrape_proxies('https://proxy-daily.com/', { useCheerio: true, isDaily: true }),
        await scrape_proxies('http://rootjazz.com/proxies/proxies.txt'),
    );

    console.log(`[SCRAPER] Loaded ${_proxies.length} proxies for check`);

    //START CHECKING
    let promises = [], index = 0;
    for (let proxy of proxies) {
        promises.push(proxy_check(proxy).then(r => {
            //console.log(r); // true
            console.log(proxy); // true
            if (ALL_ALIVE.indexOf(proxy) === -1) {
                ALL_ALIVE.push(proxy)
            }
        }).catch(e => {
            console.error(e); // ECONNRESET
        }));
        index++;

        if (index % 10 == 0) {
            await Promise.all(promises), promises = [];
        }
    }

}


module.exports = start;